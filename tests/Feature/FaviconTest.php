<?php

it('includes the configured SVG favicon links in the base layout', function (): void {
    $response = $this->get('/');

    $response->assertSuccessful();

    // Ensure the favicon is the custom SVG at /img/fav1.svg
    $response->assertSee('<link rel="icon" href="/img/fav1.svg" sizes="any">', false);
    $response->assertSee('<link rel="icon" href="/img/fav1.svg" type="image/svg+xml">', false);
});
