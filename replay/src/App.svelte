<script lang="ts">
    import CardList from "./lib/CardList.svelte";

    let newId = 0;
    function getUniqueCard(card: number): Geisha {
      return {
        id: newId++,
        card
      }
    }

    async function loadFile(event: Event) {
      const el = event.target as HTMLInputElement;
      const f = el.files[0];

      let rawStates = (await f.text()).split('\n');
      states = [];
      for (let s of rawStates) {
        if (s.trim()) {
          states.push(JSON.parse(s));
        }
      }
      newId = 0;
      cards1 = states[0].joueur_0.main.map(getUniqueCard);
      cards2 = states[0].joueur_1.main.map(getUniqueCard);
      pioche = states[0].cartes_pioche.map(getUniqueCard)
    }


    let states: State[] = [];
    let cards1: Geisha[] = [];
    let cards2: Geisha[] = [];
    let pioche: Geisha[] = [];

    function next() {
      cards1 = [...cards1, pioche[0]];
      pioche = pioche.slice(1)
    }
</script>

<main>
  <div class="top">
    <CardList cards={cards1}/>
  </div>
  <div class="bot">
    <CardList cards={cards2}/>
  </div>
  <div>
    <input type="file" on:input={loadFile}/>
    <button on:click={next}>Suivant</button>
  </div>
</main>

<style>
  main {
    display: grid;
    place-items: center;
    height: 100vh;
  }

  .top {
    position: absolute;
    left: 0;
    right: 0;
    top: .5rem;
  }


  .bot {
    position: absolute;
    left: 0;
    right: 0;
    bottom: .5rem;
  }
</style>