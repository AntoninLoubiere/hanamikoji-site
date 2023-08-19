import asyncio
from asyncio import subprocess
import os
from pathlib import Path
from random import shuffle
import tempfile
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
import traceback

from authentication.models import User
from game.models import Champion
from game.tasks import get_build_dir, isolate_cleanup, isolate_init, run_client, run_server
from website.settings import MEDIA_ROOT

USER_CHAMPION_PATH = (Path('game') / 'user_champion').absolute()
USER_TIMEOUT = 60_000
ISOLATE_USER_TIMEOUT = 3600
PLAY_MATCH_DIR = (MEDIA_ROOT / 'play').absolute()
PLAY_MATCH_DIR.mkdir(parents=True, exist_ok=True)
@database_sync_to_async
def get_champion(name):
    return Champion.objects.filter(nom=name).first()

@database_sync_to_async
def get_names():
    return list(Champion.objects.order_by('-date').values_list('nom', flat=True)), list(User.objects.values_list('username', flat=True).all())

class Game:
    games = {}
    def __init__(self, channel: "PlayConsumer", champion: Champion, first) -> None:
        self.channel = channel
        self.champion = champion
        self.username = self.channel.username
        self.games[self.username] = self
        self.user_proc = None
        self.last_line = ""
        self.user_first = first

    @classmethod
    async def new_game(cls, channel: "PlayConsumer", msg):
        if channel.username in cls.games:
            await channel.send_json({"msg": "err", "code": "already-running"})
            return

        if 'champion' not in msg or not isinstance(msg['champion'], str) or 'first' not in msg or not isinstance(msg['first'], bool):
            await channel.send_json({"msg": "err", "code": "request"})
            return

        champion = await get_champion(msg['champion'])
        if champion is None:
            await channel.send_json({"msg": "err", "code": "unk-champion"})
            return

        await cls(channel, champion, msg['first']).start()

    async def register_new_channel(self, channel: "PlayConsumer"):
        old_channel = self.channel
        self.channel = channel
        await self.channel.send(self.last_line)
        if old_channel is not None:
            asyncio.create_task(old_channel.send_json({"msg": "err", "code": "new-channel"}, close=True))

    async def start(self):
        self.is_running = True
        await self.channel.send_json({"msg": "run", "status": "started", "joueur": 1, "user": self.username, "champion": self.champion.nom})
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
            await self.on_end(stop_reason)

    async def _run(self):
        bot_name = self.champion.nom
        bot_dir = get_build_dir(self.champion)
        match_dir = PLAY_MATCH_DIR / self.username
        match_dir.mkdir(exist_ok=True)

        map_file = match_dir / 'map.txt'
        print("Génération de la map")
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

        server_task = await run_server(match_dir, s_reqrep, s_pubsub, time=USER_TIMEOUT)

        # On initialise les boite isolate
        box_bot = isolate_init(0)
        box_user = isolate_init(1)

        try:
            bot_proc = await run_client(match_dir, bot_name, bot_dir, s_reqrep, s_pubsub, 1 if self.user_first else 0, box_bot)
            self.user_proc = await run_client(match_dir, self.username, USER_CHAMPION_PATH, s_reqrep, s_pubsub, 0 if self.user_first else 1, box_user, time_isolate=ISOLATE_USER_TIMEOUT, time=USER_TIMEOUT, stdin=subprocess.PIPE)

            while True:
                line = await self.user_proc.stdout.readline()
                if line == b'':
                    break
                line = line.decode()
                if line.startswith("{"):
                    self.last_line = line
                await self.channel.send(self.last_line)

            await self.user_proc.wait()
            self.user_proc = None
            await server_task.wait()
            await bot_proc.wait()
        finally:
            isolate_cleanup(box_bot)
            isolate_cleanup(box_user)

    async def on_end(self, stop_reason):
        await self.channel.send_json({"msg": "run", "status": "ended", "reason": stop_reason})
        del self.games[self.username]

    async def actions(self, data):
        if 'cartes' not in data or not isinstance(data['cartes'], list) and any(not isinstance(n, int) for n in data):
            await self.channel.send_json({"msg": "err", "code": "request"})
            return

        if self.user_proc is None:
            await self.channel.send_json({"msg": "err", "code": "no-game"})
            return

        data = ' '.join(map(str, data['cartes']))
        self.user_proc.stdin.write(data.encode())
        self.user_proc.stdin.write(b'\n')

    def stop(self):
        if self.user_proc:
            self.user_proc.stdin.close()


class PlayConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user: User = self.scope['user']
        if not user.is_authenticated:
            await self.close(403)
            return
        self.username = user.username
        await self.accept()

        game = Game.games.get(self.username, None)
        if game is not None:
            await game.register_new_channel(self)

    async def disconnect(self, code):
        game = Game.games.get(self.username, None)
        if game is not None and game.channel is self:
            game.stop()

    async def receive_json(self, content):
        msg = content.get('msg', '')
        if msg == 'run':
            await Game.new_game(self, content)
        elif msg == 'action':
            game = Game.games.get(self.username, None)
            if game is None:
                await self.send_json({"msg": "err", "code": "no-game"})
                return
            await game.actions(content)
        elif msg == 'stop':
            game = Game.games.get(self.username, None)
            if game is None:
                await self.send_json({"msg": "err", "code": "no-game"})
                return
            game.stop()
        elif msg == 'champions':
            champions, users = await get_names()
            print(champions, users)
            await self.send_json({"msg": "champions", "champions": champions, "users": users})


