import asyncio
from asyncio import subprocess
from datetime import datetime, timedelta
import json
import os
from pathlib import Path
from random import shuffle, random
import shutil
import tempfile
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
import traceback

from authentication.models import User
from game.models import Champion
from game.tasks import get_build_dir, isolate_cleanup, isolate_init, run_client, run_server
from website.settings import ISOLATE_TIMEOUT, MEDIA_ROOT, SERVER_TIMEOUT

FORCE_STOP_TIMEOUT = 30
USER_CHAMPION_PATH = (Path('game') / 'user_champion').absolute()
USER_TIMEOUT = 300_000
ISOLATE_USER_TIMEOUT = 3600

PLAY_MATCH_DIR = (MEDIA_ROOT / 'play').absolute()
PLAY_MATCH_DIR.mkdir(parents=True, exist_ok=True)
@database_sync_to_async
def get_champion(name):
    return Champion.objects.filter(nom=name).first()

class Game:
    games: "dict[str, Game]" = {}
    waiting_defi: "dict[str, str]" = {}
    def __init__(self, channel, player1, player2, other_user=None, forward_to_game=None) -> None:
        self.player1 = player1
        self.player2 = player2
        self.waiting_user = None
        self.game_name = channel.username
        self.games[self.game_name] = self
        self.player1_proc = None
        self.player2_proc = None
        self.server_task = None
        self.waiting_user = other_user
        self.forward_to_game = forward_to_game
        self.is_running = False
        assert self.waiting_user != self.game_name
        self.stopped = None

    @classmethod
    async def new_game(cls, channel: "PlayConsumer", msg):
        if channel.username in cls.games:
            if cls.games[channel.username].is_running:
                await channel.send_json({"msg": "err", "code": "already-running"})
                return
            await cls.games[channel.username].stop()
            game = cls.games.get(channel.username, None)
            if game is not None:
                await game.del_game()

        if 'first' in msg and not isinstance(msg['first'], bool):
            await channel.send_json({"msg": "err", "code": "request"})
            return

        first = msg.get(msg['first'], None)
        if first is None:
            first = random() < 0.5

        if 'champion' in msg and isinstance(msg['champion'], str):
            champion = await get_champion(msg['champion'])
            if champion is None:
                await channel.send_json({"msg": "err", "code": "unk-champion"})
                return

            if first:
                await cls(channel, channel, champion).start()
            else:
                await cls(channel, champion, channel).start()
        elif 'user' in msg and isinstance(msg['user'], str):
            other_user = msg['user']
            if other_user == channel.username:
                await channel.send_json({"msg": "err", "code": "self-match"})
                return

            game = cls.games.get(other_user, None)
            await channel.send_json({"msg": "run", "status": "waiting", "user": channel.username, "champion": other_user})
            other_channel = PlayConsumer.channels.get(other_user, None)
            if other_channel is not None:
                await other_channel.send_json({"msg": "defi", "user": channel.username})
            Game.waiting_defi[other_user] = channel.username

            if game is None or game.waiting_user != channel.username:
                if first:
                    cls(channel, channel, None, other_user)
                else:
                    cls(channel, None, channel, other_user)

            else:
                assert (game is not None and game.waiting_user == channel.username)
                if game.player1 is None:
                    game.player1 = channel
                    cls(channel, channel, game.player2, other_user, game)
                elif game.player2 is None:
                    game.player2 = channel
                    cls(channel, game.player1, channel, other_user, game)
                await game.start()

        else:
            await channel.send_json({"msg": "err", "code": "request"})

    async def del_game(self):
        del self.games[self.game_name]
        if self.waiting_user in self.waiting_defi and self.waiting_defi[self.waiting_user] == self.game_name:
            del self.waiting_defi[self.waiting_user]
            channel = PlayConsumer.channels.get(self.waiting_user, None)
            if channel is not None:
                await channel.send_json({"msg": "defi-cancel", "user": self.game_name})

    def is_player(self, player, username):
        return isinstance(player, PlayConsumer) and player.username == username

    async def register_new_channel(self, channel: "PlayConsumer"):
        await self.stop()
        if self.is_player(self.player1, channel.username):
            asyncio.create_task(self.player1.send_json({"msg": "err", "code": "new-channel"}))
        if self.is_player(self.player2, channel.username):
            asyncio.create_task(self.player2.send_json({"msg": "err", "code": "new-channel"}))

    async def start(self):
        self.is_running = True
        if self.waiting_user is not None:
            if self.waiting_user in self.games:
                game = self.games[self.waiting_user]
                game.is_running = True
            else:
                return

            if self.waiting_user in self.waiting_defi and self.waiting_defi[self.waiting_user] == self.game_name:
                del self.waiting_defi[self.waiting_user]
            if self.game_name in self.waiting_defi and self.waiting_defi[self.game_name] == self.waiting_user:
                del self.waiting_defi[self.game_name]
        self.running_task = asyncio.create_task(self.run())

    async def run(self):
        stop_reason = "ok"
        try:
            await self._run()
        except TimeoutError:
            stop_reason = "timeout"
        except Exception as e:
            stop_reason = f"error {e.__class__.__name__}"
            traceback.print_exc()
        finally:
            try:
                await self.on_end(stop_reason)
            except Exception as e:
                traceback.print_exc()

    def get_name_dir(self, player):
        if isinstance(player, Champion):
            return player.nom, get_build_dir(player), False
        else:
            return player.username, USER_CHAMPION_PATH, True

    async def _run(self):
        player1_name, player1_dir, is_player1_user = self.get_name_dir(self.player1)
        player2_name, player2_dir, is_player2_user = self.get_name_dir(self.player2)
        print("Start match", player1_name, "vs", player2_name)

        if is_player1_user:
            await self.player1.send_json({"msg": "run", "status": "started", "joueur": 0, "user": player1_name, "champion": player2_name})
        if is_player2_user:
            await self.player2.send_json({"msg": "run", "status": "started", "joueur": 1, "user": player2_name, "champion": player1_name})

        match_dir = PLAY_MATCH_DIR / self.game_name
        match_dir.mkdir(exist_ok=True)

        map_file = match_dir / 'map.txt'
        with open(map_file, 'w') as fiw:
            cards = [0, 0, 1, 1, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6, 6]
            for _ in range(3):
                shuffle(cards)
                fiw.write(" ".join(map(str, cards)) + "\n")

        # Lancement du match
        # Build the domain sockets
        socket_dir = tempfile.TemporaryDirectory(prefix='match-')
        os.chmod(socket_dir.name, 0o777)
        f_reqrep = socket_dir.name + '/' + 'reqrep'
        f_pubsub = socket_dir.name + '/' + 'pubsub'
        s_reqrep = 'ipc://' + f_reqrep
        s_pubsub = 'ipc://' + f_pubsub

        self.server_task = await run_server(match_dir, s_reqrep, s_pubsub, time=USER_TIMEOUT, socket_timeout=USER_TIMEOUT + 30000)

        # On initialise les boite isolate
        box_player1 = isolate_init(0)
        box_player2 = isolate_init(1)

        try:
            self.player1_proc = await run_client(match_dir, player1_name, player1_dir, s_reqrep,
                    s_pubsub, 0, box_player1, time_isolate=ISOLATE_USER_TIMEOUT if is_player1_user else ISOLATE_TIMEOUT,
                    time=USER_TIMEOUT if is_player1_user else SERVER_TIMEOUT, stdin=subprocess.PIPE if is_player1_user else None, socket_timeout=USER_TIMEOUT + 30000)
            self.player2_proc = await run_client(match_dir, player2_name, player2_dir, s_reqrep,
                    s_pubsub, 1, box_player2, time_isolate=ISOLATE_USER_TIMEOUT if is_player2_user else ISOLATE_TIMEOUT,
                    time=USER_TIMEOUT if is_player2_user else SERVER_TIMEOUT, stdin=subprocess.PIPE if is_player2_user else None, socket_timeout=USER_TIMEOUT + 30000)

            tasks = []
            if is_player1_user:
                tasks.append(self.read_stdout(self.player1_proc, self.player1))
            if is_player2_user:
                tasks.append(self.read_stdout(self.player2_proc, self.player2))

            await asyncio.gather(*tasks, self.player1_proc.wait(), self.player2_proc.wait(), self.server_task.wait())

            champ = None
            proc = None
            if isinstance(self.player1, Champion):
                champ = self.player1
                proc = self.player1_proc
                user_channel = self.player2
            elif isinstance(self.player2, Champion):
                champ = self.player2
                proc = self.player2_proc
                user_channel = self.player1

            if champ is not None:
                content = "Vous n'avez pas acces à cette sortie.\n".encode()
                if isinstance(user_channel, PlayConsumer) and user_channel.scope['user'].pk == champ.uploader_id:
                    content = await proc.stdout.read()

                with open(match_dir / 'out.txt', 'wb') as fiw:
                    fiw.write(content)

            self.player1_proc = None
            self.player2_proc = None
            self.server_task = None
            print("Fin match", player1_name, "vs", player2_name)
        finally:
            isolate_cleanup(box_player1)
            isolate_cleanup(box_player2)

    async def on_end(self, stop_reason):
        self.is_running = False

        if isinstance(self.player1, PlayConsumer):
            await self.player1.send_json({"msg": "run", "status": "ended", "reason": stop_reason})
        if isinstance(self.player2, PlayConsumer):
            await self.player2.send_json({"msg": "run", "status": "ended", "reason": stop_reason})

        if self.waiting_user:
            game = self.games[self.waiting_user]
            if game is not None:
                await game.on_other_end()
        await self.del_game()

    async def on_other_end(self):
        self.is_running = False
        await self.del_game()

        match_dir = PLAY_MATCH_DIR / self.waiting_user
        out_dir = PLAY_MATCH_DIR / self.game_name
        out_dir.mkdir(exist_ok=True)
        shutil.copy(match_dir / 'map.txt', out_dir / 'map.txt')
        shutil.copy(match_dir / 'dump.json', out_dir / 'dump.json')

    async def actions(self, channel, data):
        if self.forward_to_game is not None:
            return await self.forward_to_game.actions(channel, data)

        if 'cartes' not in data or not isinstance(data['cartes'], list) and any(not isinstance(n, int) for n in data):
            await channel.send_json({"msg": "err", "code": "request"})
            return

        proc = None
        if self.is_player(self.player1, channel.username):
            proc = self.player1_proc
        elif self.is_player(self.player2, channel.username):
            proc = self.player2_proc

        if proc is None:
            await channel.send_json({"msg": "err", "code": "no-game"})
            return

        data = ' '.join(map(str, data['cartes']))
        proc.stdin.write(data.encode())
        proc.stdin.write(b'\n')

    async def choix(self, channel, data):
        if self.forward_to_game is not None:
            return await self.forward_to_game.choix(channel, data)

        if 'choix' not in data or not isinstance(data['choix'], int):
            await channel.send_json({"msg": "err", "code": "request"})
            return

        proc = None
        send_channel = None
        if isinstance(self.player1, PlayConsumer):
            if self.player1.username == channel.username:
                proc = self.player1_proc
            else:
                send_channel = self.player1

        if isinstance(self.player2, PlayConsumer):
            if self.player2.username == channel.username:
                proc = self.player2_proc
            else:
                send_channel = self.player2

        if proc is None:
            await channel.send_json({"msg": "err", "code": "no-game"})
            return

        proc.stdin.write(str(data['choix']).encode())
        proc.stdin.write(b'\n')

        if send_channel is not None:
            await send_channel.send_json({"msg": "choix", "choix": data['choix']})

    async def stop(self):
        print("Stopping", self.game_name)
        if not self.is_running and self.game_name in self.games:
            await self.del_game()

        if self.forward_to_game is not None:
            return await self.forward_to_game.stop()

        if self.stopped is None:
            self.stopped = datetime.now()
        elif datetime.now() - self.stopped > timedelta(seconds=FORCE_STOP_TIMEOUT):
            print("FORCE STOP", self.game_name)
            if self.player1_proc is not None and self.player1_proc.returncode is None:
                self.player1_proc.terminate()
            if self.player2_proc is not None and self.player2_proc.returncode is None:
                self.player2_proc.terminate()
            if self.server_task is not None and self.server_task.returncode is None:
                self.server_task.terminate()
            self.stopped = None

        if self.player1_proc is not None and self.player1_proc.stdin is not None:
            self.player1_proc.stdin.close()
        if self.player2_proc is not None and self.player2_proc.stdin is not None:
            self.player2_proc.stdin.close()

    async def read_stdout(self, proc, player: "PlayConsumer"):
        NEW_MANCHE_BEACON = 'new-manche'
        while True:
            line = await proc.stdout.readline()
            if line == b'':
                break
            line: str = line.decode()
            if line.startswith(NEW_MANCHE_BEACON):
                line = line[len(NEW_MANCHE_BEACON):]

                send_channel = None
                if isinstance(self.player1, PlayConsumer) and self.player1.username != player.username:
                    send_channel = self.player1
                elif isinstance(self.player2, PlayConsumer) and self.player2.username != player.username:
                    send_channel = self.player2

                if send_channel:
                    data = json.loads(line)
                    await send_channel.send_json({
                        'msg': 'new-manche',
                        'joueur': 1 - data['joueur'],
                        "possession": data["possession"],
                        "manche": data["manche"],
                        "tour": data["tour"],
                    })
            if player.connected:
                await player.send(line)
            else:
                await self.stop()

class PlayConsumer(AsyncJsonWebsocketConsumer):
    channels: "dict[str, PlayConsumer]" = {}
    async def connect(self):
        user: User = self.scope['user']
        self.username = ""
        if not user.is_authenticated:
            await self.close(code=4003)
            return
        self.username = user.username
        await self.accept()
        self.channels[self.username] = self

        self.connected = True
        defi_username = Game.waiting_defi.get(self.username, None)
        if defi_username is not None:
                await self.send_json({"msg": "defi", "user": defi_username})

    async def disconnect(self, code):
        self.connected = False
        game = Game.games.get(self.username, None)
        if game is not None and (game.player1 is self or game.player2 is self):
            await game.stop()

        channel = self.channels.get(self.username, None)
        if channel is self:
            self.channels[self.username] = None

    async def receive_json(self, content):
        msg = content.get('msg', '')
        if msg == 'run':
            await Game.new_game(self, content)
        elif msg == 'action':
            game = Game.games.get(self.username, None)
            if game is None:
                await self.send_json({"msg": "err", "code": "no-game"})
                return
            await game.actions(self, content)
        elif msg == 'choix':
            game = Game.games.get(self.username, None)
            if game is None:
                await self.send_json({"msg": "err", "code": "no-game"})
                return
            await game.choix(self, content)
        elif msg == 'stop':
            game = Game.games.get(self.username, None)
            if game is None:
                await self.send_json({"msg": "err", "code": "no-game"})
                return
            await game.stop()
        elif msg == 'defi-reject':
            other_username = content.get('user', '')
            game = Game.games.get(other_username, None)
            if game is None or game.waiting_user != self.username:
                await self.send_json({"msg": "err", "code": "no-game"})
                return

            channel = self.channels.get(other_username, None)
            if channel is not None:
                await channel.send_json({"msg": "err", "code": "defi_reject"})
            await game.stop()


