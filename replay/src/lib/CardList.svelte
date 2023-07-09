<script lang="ts">
    import Card from "./Card.svelte";
    import { flip } from "svelte/animate";
    import { quintOut } from "svelte/easing";
    import { crossfade } from "svelte/transition";

    export let cards: Geisha[];
    const [send, receive] = crossfade({
        fallback(node, params) {
            const style = getComputedStyle(node);
            const transform = style.transform === "none" ? "" : style.transform;

            return {
                duration: 600,
                easing: quintOut,
                css: (t) => `
					transform: ${transform} scale(${t});
					opacity: ${t}
				`,
            };
        },
    });
</script>

<div class="container">
    {#each cards as geisha (geisha.id)}
        <div
            in:receive={{ key: geisha.card }}
            out:send={{ key: geisha.card }}
            animate:flip={{ duration: 600 }}
        >
            <Card {geisha} />
        </div>
    {/each}
</div>

<style>
    .container {
        display: flex;
        justify-content: center;
        gap: .5rem;
    }
</style>