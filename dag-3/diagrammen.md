flowchart TD
    A[Speler joint de game] --> B[Spawn in startgebied]
    B --> C[Verken de map]
    C --> D[Verzamel resources]
    D --> E{Zombies gespot?}

    E -- Ja --> F[Vecht tegen zombies]
    F --> G{Speler overleeft?}
    G -- Ja --> H[Krijg XP / Coins / Loot]
    H --> I[Upgrade wapens / barricades]
    I --> C

    G -- Nee --> J[Speler dood]
    J --> K[Respawn of Game Over]
    K --> B

    E -- Nee --> C
