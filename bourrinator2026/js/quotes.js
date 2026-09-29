// Répliques originales, écrites « à la manière de » — le Narrateur a du vocabulaire et peu de patience.

export const pick = (a) => a[(Math.random() * a.length) | 0];

export const Q = {
  taglines: [
    "Le seul jeu où la casse n'est remboursée par personne.",
    "Quand on a des nerfs, faut bien les passer sur quelque chose.",
    "Ici, la délicatesse, on la laisse à l'entrée. Avec le parapluie.",
    "Un bourrin, c'est un poète qui s'exprime en décibels.",
    "La vaisselle, c'est comme la réputation : ça se casse en une fois.",
  ],

  intro: {
    magasin: [
      "Une supérette. Des rayons bien rangés, des prix bien alignés. Ça va pas durer.",
      "Les soldes, c'est toute l'année quand on vient avec ses propres outils.",
    ],
    restaurant: [
      "Le chef a dit : on casse la croûte. Il a pas précisé laquelle.",
      "Nappes blanches, verres en cristal… Le genre d'endroit où le bruit du verre, ça porte loin.",
    ],
    bureau: [
      "Vingt ans de réunions qui auraient pu être un mail. Aujourd'hui, c'est l'ordre du jour qui saute.",
      "L'open space. On l'a voulu ouvert, on va l'ouvrir en grand.",
    ],
    cinema: [
      "Un cinéma. Ce soir, le spectacle, c'est nous.",
      "Le film est en version originale. La démolition, elle, se passe de sous-titres.",
    ],
    hotel: [
      "Un palace. Cinq étoiles. On va voir combien il en reste à la fin.",
      "Le personnel est aux petits soins. Nous aussi, mais avec une masse.",
    ],
    banque: [
      "Une banque. Pour une fois, c'est nous qui allons faire un retrait.",
      "Le banquier vous prête un parapluie quand il fait beau. Aujourd'hui, il pleut du plâtre.",
    ],
    garage: [
      "Une carrosserie. On y redresse la tôle. Nous, on est plutôt spécialisés dans l'inverse.",
      "Vidange, pneus, freins… Et en option, démolition complète. Sans rendez-vous.",
    ],
    musee: [
      "Un musée. Défense de toucher aux œuvres. On ne touche pas : on percute.",
      "Des siècles d'art et d'histoire. Il était temps de moderniser la collection.",
    ],
    maison: [
      "Une maison, c'est comme un ménage : ça tient jusqu'au jour où quelqu'un tape du poing sur la table.",
      "Le papier peint à fleurs de belle-maman. Rien que pour ça, on serait venu à pied.",
    ],
  },

  weapon: {
    masse: "La masse. L'outil du philosophe : un seul argument, mais il porte.",
    batte: "La batte. Le sport national de ceux qui ont perdu patience.",
    pelle: "La pelle. Pour ceux qui trouvent que le rez-de-chaussée, c'est encore trop haut.",
    minigun: "La minigun. Quand la mitraillette ne suffisait plus à exprimer ses sentiments.",
    tronconneuse: "La tronçonneuse. Pour ceux qui trouvent que les meubles en kit, ça se démonte trop lentement.",
    mine: "La mine. Quatre secondes pour réfléchir à ce qu'on a fait. C'est trois de trop.",
    roquette: "Le lance-roquette. Pour les discussions qui ont assez duré.",
    bombinette: "La bombinette. Petite, ronde, souriante. Comme les ennuis.",
  },

  combo: [
    "Ça, c'est du travail d'artisan. Du propre, du net, du définitif.",
    "Quand ça part, ça part. On va pas demander au facteur de freiner.",
    "On n'est pas des sauvages. On est pire : on est méthodiques.",
    "Le mobilier, c'est comme les promesses : ça se casse plus vite que ça se monte.",
    "Je dis pas que c'est joli. Je dis que c'est fait.",
    "La délicatesse, y a des jours où faut la laisser au vestiaire.",
    "Le calme, c'est pour les notaires et les poissons rouges.",
    "C'est pas de la violence, c'est de la rénovation accélérée.",
    "Un homme qui casse, c'est un homme qui réfléchit avec les bras.",
    "Continuez comme ça et l'assureur va se mettre au yoga.",
    "Moi, les meubles en kit, je les démonte sans la notice.",
  ],

  explosion: [
    "Boum. Voilà. Au moins, là, c'est clair pour tout le monde.",
    "L'explosif, c'est le seul argument qui convainc du premier coup.",
    "Si ça fume encore, c'est que c'était pas tout à fait fini.",
    "Le plan d'urbanisme, je viens de le réviser. Sans concertation.",
  ],

  masterpiece: [
    "Cinq siècles de conservation. Quatre secondes de démolition.",
    "Elle souriait depuis la Renaissance. Là, elle fait moins la maligne.",
  ],
  car: [
    "Un devis de carrosserie, ça se négocie. Là, ça se négocie plus.",
    "Contrôle technique : défavorable.",
  ],
  vault: [
    "Le coffre est ouvert. Les intérêts, c'est maintenant.",
    "Quarante centimètres d'acier. Ils avaient prévu les voleurs, pas les bourrins.",
  ],
  steel: [
    "C'est de l'acier blindé, mon grand. Faut lui parler plus fort : essayez l'explosif.",
  ],
  bombArmed: [
    "La mèche est allumée. À votre place, je ne resterais pas pour le spectacle.",
  ],
  bomb: [
    "Elle souriait. On aurait dû se méfier.",
    "Trente pour cent d'un coup. Le reste, c'est pour la prochaine fois.",
    "On l'a prise pour un jouet. Elle l'a mal pris.",
  ],
  water: [
    "La nappe phréatique. À ce stade, on ne casse plus : on fore.",
    "De l'eau. Ils vont pouvoir ouvrir une piscine, au moins, ça fera un investissement.",
  ],
  glass: [
    "Une vitre de moins, c'est de l'air en plus. On appelle ça l'aération.",
    "Le verre, ça prévient jamais, mais ça fait toujours son petit effet.",
  ],
  screen: [
    "L'écran plat. Maintenant, il est plat pour de vrai.",
    "Pas de réseau ? Pas de souci. Y a plus d'écran non plus.",
  ],
  wall: [
    "Les murs ont des oreilles. Là, ils ont surtout des trous.",
    "Un mur porteur, qu'ils disaient. Il porte plus grand-chose, hein.",
  ],
  collapse: [
    "Et voilà l'étagère qui rend son tablier. Elle avait plus le cœur à l'ouvrage.",
    "Quand la base cède, le reste suit. C'est la politique, en plus bruyant.",
  ],
  idle: [
    "Alors, on attend quoi ? Que le papier peint s'excuse ?",
    "Le silence, c'est bon pour les églises. Ici, on est venu faire du bruit.",
    "On se tâte ? À votre place, je tâterais plutôt le mobilier.",
  ],
  empty: [
    "Plus de cartouches ? Rechargez, on n'est pas au guichet.",
  ],
  milestone: {
    25: "Un quart du boulot. Le reste, c'est de la persévérance.",
    50: "La moitié. Le verre à moitié vide, on l'a déjà cassé.",
    75: "Trois quarts. À ce stade, c'est plus un chantier, c'est une œuvre.",
    90: "Il reste presque rien. Même les courants d'air se sentent gênés.",
  },
  timeUp: [
    "C'est l'heure. On range rien, on s'en va.",
    "Fin de la récréation. L'addition, s'il vous plaît.",
  ],

  ranks: [
    { min: 0, title: "Petit joueur", quote: "Vous avez tapé comme on signe un chèque en bois : sans y croire." },
    { min: 30000, title: "Casseur du dimanche", quote: "C'est honnête. Mais l'honnêteté, ça n'a jamais rien démoli." },
    { min: 90000, title: "Démolisseur agréé", quote: "Du bon boulot. Le genre de boulot qu'on facture pas, parce qu'on s'enfuit." },
    { min: 220000, title: "Tornade en costard", quote: "Là, on cause. Quand vous passez, même les courants d'air prennent des notes." },
    { min: 450000, title: "BOURRINATOR", quote: "Chapeau. Des comme vous, on n'en fait plus. Et tant mieux pour les assurances." },
  ],

  comboLabels: ["", "", "PAS MAL", "ÇA CAUSE", "LE BORDEL", "LA CASSE", "CARNAGE", "CARNAGE", "APOCALYPSE", "APOCALYPSE", "BOURRINATOR"],
};
