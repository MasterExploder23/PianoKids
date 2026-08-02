// data/curriculum.js
// Curriculum de lecciones: 5 modulos, 23 lecciones, 4 fases cada una.
// Se carga con un <script> normal antes de la app, asi que queda en el
// scope global igual que antes. Sin fetch: el arranque sigue siendo sincronico.
const MODULOS = [
  {
    id: 'notas',
    nombre: 'Las notas',
    libres: 2,
    emoji: '🎵',
    color: '#FF6B6B',
    desc: 'Ubicarte en el teclado y conocer las 7 notas',
    lecciones: [
      {
        id: 'n1',
        nombre: 'Encontrar el Do',
        emoji: '🔴',
        explicacion: {
          titulo: '¿Cómo encuentro el Do?',
          texto:
            'Mirá el teclado: las teclas negras vienen en grupitos de <b>2</b> y de <b>3</b>. Buscá un grupo de <b>2 negras</b>. La tecla blanca que está justo a su izquierda es el <b>Do</b>.',
          tip: 'Este truco funciona en cualquier piano del mundo 🌎',
        },
        demo: ['C4'],
        practica: [
          { n: 'C4', pista: 'Buscá el grupo de 2 negras y tocá la blanca de la izquierda' },
          { n: 'C5', pista: 'Ahora el Do de más arriba' },
          { n: 'C4', pista: 'Volvé al Do del medio' },
        ],
        evaluacion: [{ n: 'C4' }, { n: 'C5' }, { n: 'C3' }],
      },
      {
        id: 'n2',
        nombre: 'Re y Mi',
        emoji: '🟠',
        explicacion: {
          titulo: 'Las vecinas del Do',
          texto:
            'Justo a la derecha del Do está el <b>Re</b>, y al lado el <b>Mi</b>. Do, Re y Mi son las tres blancas que rodean al grupo de 2 negras.',
          tip: 'Do-Re-Mi son las tres primeras notas de casi todas las canciones que ya conocés 🎶',
        },
        demo: ['C4', 'D4', 'E4'],
        practica: [
          { n: 'D4', pista: 'El Re: a la derecha del Do' },
          { n: 'E4', pista: 'El Mi: una más a la derecha' },
          { n: 'C4' },
          { n: 'D4' },
          { n: 'E4' },
        ],
        evaluacion: [{ n: 'C4' }, { n: 'D4' }, { n: 'E4' }, { n: 'D4' }, { n: 'C4' }],
      },
      {
        id: 'n3',
        nombre: 'Fa, Sol, La y Si',
        emoji: '🟡',
        explicacion: {
          titulo: 'El grupo de 3 negras',
          texto:
            'Después del Mi viene el <b>Fa</b>, que está pegado al grupo de <b>3 negras</b>. Y siguen <b>Sol</b>, <b>La</b> y <b>Si</b>. Con estas cuatro completamos las 7 notas.',
          tip: 'Fa está a la izquierda de las 3 negras, igual que Do está a la izquierda de las 2 🔍',
        },
        demo: ['F4', 'G4', 'A4', 'B4'],
        practica: [
          { n: 'F4', pista: 'El Fa: a la izquierda del grupo de 3 negras' },
          { n: 'G4', pista: 'Sol' },
          { n: 'A4', pista: 'La' },
          { n: 'B4', pista: 'Si' },
        ],
        evaluacion: [{ n: 'F4' }, { n: 'G4' }, { n: 'A4' }, { n: 'B4' }, { n: 'F4' }],
      },
      {
        id: 'n4',
        nombre: 'La escala subiendo',
        emoji: '🪜',
        explicacion: {
          titulo: 'Do Re Mi Fa Sol La Si Do',
          texto:
            'Si tocás las 7 notas seguidas y volvés al Do, hiciste una <b>escala</b>. Es como una escalera: cada nota es un escalón más agudo que el anterior.',
          tip: 'Escuchá cómo el último Do suena igual que el primero, pero más agudo ✨',
        },
        demo: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'],
        practica: [
          { n: 'C4' },
          { n: 'D4' },
          { n: 'E4' },
          { n: 'F4' },
          { n: 'G4' },
          { n: 'A4' },
          { n: 'B4' },
          { n: 'C5', pista: '¡Y volvemos al Do!' },
        ],
        evaluacion: [
          { n: 'C4' },
          { n: 'D4' },
          { n: 'E4' },
          { n: 'F4' },
          { n: 'G4' },
          { n: 'A4' },
          { n: 'B4' },
          { n: 'C5' },
        ],
      },
      {
        id: 'n5',
        nombre: 'La escala bajando',
        emoji: '🛝',
        explicacion: {
          titulo: 'Ahora al revés',
          texto:
            'Bajar la escala es tocar las mismas notas pero desde el Do de arriba hasta el de abajo: <b>Do Si La Sol Fa Mi Re Do</b>.',
          tip: 'Bajar cuesta un poco más que subir. Andá despacio 🐢',
        },
        demo: ['C5', 'B4', 'A4', 'G4', 'F4', 'E4', 'D4', 'C4'],
        practica: [
          { n: 'C5' },
          { n: 'B4' },
          { n: 'A4' },
          { n: 'G4' },
          { n: 'F4' },
          { n: 'E4' },
          { n: 'D4' },
          { n: 'C4' },
        ],
        evaluacion: [
          { n: 'C5' },
          { n: 'B4' },
          { n: 'A4' },
          { n: 'G4' },
          { n: 'F4' },
          { n: 'E4' },
          { n: 'D4' },
          { n: 'C4' },
        ],
      },
      {
        id: 'n6',
        nombre: 'Ida y vuelta',
        emoji: '🏅',
        explicacion: {
          titulo: 'Prueba del módulo',
          texto:
            'Ya conocés las 7 notas y sabés subir y bajar. Esta es la prueba final: la escala completa, <b>ida y vuelta</b>, sin ayuda.',
          tip: 'Si te trabás, podés repetir la lección las veces que quieras 💪',
        },
        demo: [
          'C4',
          'D4',
          'E4',
          'F4',
          'G4',
          'A4',
          'B4',
          'C5',
          'B4',
          'A4',
          'G4',
          'F4',
          'E4',
          'D4',
          'C4',
        ],
        practica: [
          { n: 'C4' },
          { n: 'E4' },
          { n: 'G4' },
          { n: 'C5' },
          { n: 'G4' },
          { n: 'E4' },
          { n: 'C4' },
        ],
        evaluacion: [
          { n: 'C4' },
          { n: 'D4' },
          { n: 'E4' },
          { n: 'F4' },
          { n: 'G4' },
          { n: 'A4' },
          { n: 'B4' },
          { n: 'C5' },
          { n: 'B4' },
          { n: 'A4' },
          { n: 'G4' },
          { n: 'F4' },
          { n: 'E4' },
          { n: 'D4' },
          { n: 'C4' },
        ],
      },
    ],
  },
  {
    id: 'dedos',
    nombre: 'Manos y dedos',
    libres: 2,
    emoji: '🖐️',
    color: '#FF9F43',
    desc: 'Qué dedo usar en cada tecla',
    lecciones: [
      {
        id: 'd1',
        nombre: 'Cada dedo tiene número',
        emoji: '1️⃣',
        explicacion: {
          titulo: 'Los dedos se numeran',
          texto:
            'En el piano cada dedo tiene un número: el <b>pulgar es el 1</b>, el índice el <b>2</b>, el mayor el <b>3</b>, el anular el <b>4</b> y el meñique el <b>5</b>. Es igual en las dos manos.',
          tip: 'Activá el botón "Dedos" arriba del teclado para ver los números mientras tocás 👆',
        },
        demo: ['C4', 'D4', 'E4', 'F4', 'G4'],
        practica: [
          { n: 'C4', pista: 'Pulgar (1) en el Do' },
          { n: 'D4', pista: 'Índice (2) en el Re' },
          { n: 'E4', pista: 'Mayor (3) en el Mi' },
          { n: 'F4', pista: 'Anular (4) en el Fa' },
          { n: 'G4', pista: 'Meñique (5) en el Sol' },
        ],
        evaluacion: [{ n: 'C4' }, { n: 'D4' }, { n: 'E4' }, { n: 'F4' }, { n: 'G4' }],
      },
      {
        id: 'd2',
        nombre: 'Posición de 5 dedos',
        emoji: '✋',
        explicacion: {
          titulo: 'La mano quieta',
          texto:
            'Apoyá los 5 dedos de la mano derecha sobre <b>Do Re Mi Fa Sol</b> y dejalos ahí. Podés tocar cualquiera de esas notas <b>sin mover la mano</b>.',
          tip: 'Mantené los dedos curvados, como si tuvieras una pelotita en la mano 🥎',
        },
        demo: ['C4', 'E4', 'G4', 'E4', 'C4'],
        practica: [
          { n: 'E4', pista: 'Sin mover la mano: dedo 3' },
          { n: 'G4', pista: 'Dedo 5' },
          { n: 'D4', pista: 'Dedo 2' },
          { n: 'F4', pista: 'Dedo 4' },
          { n: 'C4', pista: 'Dedo 1' },
        ],
        evaluacion: [{ n: 'G4' }, { n: 'E4' }, { n: 'C4' }, { n: 'F4' }, { n: 'D4' }, { n: 'G4' }],
      },
      {
        id: 'd3',
        nombre: 'Saltos con la mano quieta',
        emoji: '🦘',
        explicacion: {
          titulo: 'Tocar salteado',
          texto:
            'Ahora vamos a tocar las notas <b>salteadas</b>: Do, Mi, Sol. La mano sigue en el mismo lugar, sólo cambian los dedos: <b>1, 3 y 5</b>.',
          tip: 'Estas tres notas juntas forman el acorde de Do. Ya lo vas a ver 😉',
        },
        demo: ['C4', 'E4', 'G4', 'E4', 'C4', 'G4'],
        practica: [{ n: 'C4' }, { n: 'E4' }, { n: 'G4' }, { n: 'E4' }, { n: 'C4' }],
        evaluacion: [
          { n: 'C4' },
          { n: 'E4' },
          { n: 'G4' },
          { n: 'C4' },
          { n: 'G4' },
          { n: 'E4' },
          { n: 'C4' },
        ],
      },
      {
        id: 'd4',
        nombre: 'Pasar el pulgar',
        emoji: '👍',
        explicacion: {
          titulo: 'El truco más importante',
          texto:
            'La mano tiene 5 dedos pero la escala tiene 8 notas. El truco es <b>pasar el pulgar por debajo</b> después del Mi: tocás Do-Re-Mi con 1-2-3, y para el Fa pasás el pulgar por abajo y seguís 1-2-3-4-5.',
          tip: 'Es raro al principio y le pasa a todo el mundo. Con práctica sale solo 🎯',
        },
        demo: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'],
        practica: [
          { n: 'C4', pista: 'Dedo 1' },
          { n: 'D4', pista: 'Dedo 2' },
          { n: 'E4', pista: 'Dedo 3' },
          { n: 'F4', pista: '¡Pasá el pulgar! Dedo 1' },
          { n: 'G4', pista: 'Dedo 2' },
          { n: 'A4', pista: 'Dedo 3' },
          { n: 'B4', pista: 'Dedo 4' },
          { n: 'C5', pista: 'Dedo 5' },
        ],
        evaluacion: [
          { n: 'C4' },
          { n: 'D4' },
          { n: 'E4' },
          { n: 'F4' },
          { n: 'G4' },
          { n: 'A4' },
          { n: 'B4' },
          { n: 'C5' },
        ],
      },
    ],
  },
  {
    id: 'intervalos',
    nombre: 'Intervalos',
    libres: 1,
    emoji: '📏',
    color: '#0099bb',
    desc: 'La distancia entre dos notas',
    lecciones: [
      {
        id: 'i1',
        nombre: 'Segundas: notas vecinas',
        emoji: '👯',
        explicacion: {
          titulo: 'Notas pegaditas',
          texto:
            'Cuando tocás dos notas <b>vecinas</b> —una al lado de la otra— eso es una <b>segunda</b>. Do-Re es una segunda. Re-Mi también.',
          tip: 'Las segundas suenan un poco "chocadas" cuando las tocás juntas 😬',
        },
        demo: ['C4', 'D4', 'E4', 'F4'],
        practica: [
          { n: 'C4' },
          { n: 'D4', pista: 'Segunda: la vecina de arriba' },
          { n: 'E4' },
          { n: 'F4', pista: 'Otra segunda' },
        ],
        evaluacion: [{ n: 'G4' }, { n: 'A4' }, { n: 'D4' }, { n: 'E4' }],
      },
      {
        id: 'i2',
        nombre: 'Terceras: salteás una',
        emoji: '🎯',
        explicacion: {
          titulo: 'Saltear una nota',
          texto:
            'Si tocás una nota y <b>salteás la siguiente</b>, eso es una <b>tercera</b>. Do-Mi es una tercera: te salteaste el Re.',
          tip: 'Las terceras suenan lindas juntas. Son la base de los acordes 🎸',
        },
        demo: ['C4', 'E4', 'D4', 'F4', 'E4', 'G4'],
        practica: [
          { n: 'C4' },
          { n: 'E4', pista: 'Salteá el Re' },
          { n: 'D4' },
          { n: 'F4', pista: 'Salteá el Mi' },
          { n: 'E4' },
          { n: 'G4', pista: 'Salteá el Fa' },
        ],
        evaluacion: [{ n: 'C4' }, { n: 'E4' }, { n: 'F4' }, { n: 'A4' }, { n: 'G4' }, { n: 'B4' }],
      },
      {
        id: 'i3',
        nombre: 'Quintas: bien separadas',
        emoji: '🌉',
        explicacion: {
          titulo: 'De Do a Sol',
          texto:
            'Una <b>quinta</b> es una distancia más grande: contás cinco notas. De <b>Do a Sol</b> hay una quinta. De <b>Fa a Do</b> también.',
          tip: 'Las quintas suenan "abiertas" y fuertes. Se usan mucho en el rock 🤘',
        },
        demo: ['C4', 'G4', 'F4', 'C5', 'G4', 'D5'],
        practica: [
          { n: 'C4' },
          { n: 'G4', pista: 'Quinta arriba del Do' },
          { n: 'F4' },
          { n: 'C5', pista: 'Quinta arriba del Fa' },
        ],
        evaluacion: [{ n: 'C4' }, { n: 'G4' }, { n: 'D4' }, { n: 'A4' }, { n: 'E4' }, { n: 'B4' }],
      },
      {
        id: 'i4',
        nombre: 'Reconocer de oído',
        emoji: '👂',
        explicacion: {
          titulo: '¿Cerca o lejos?',
          texto:
            'Ahora escuchá con atención. Te voy a tocar dos notas y vos las repetís. Prestá atención a si están <b>cerca</b> (segunda), <b>medio lejos</b> (tercera) o <b>bien lejos</b> (quinta).',
          tip: 'Cerrá los ojos en la demostración. El oído se entrena escuchando 🎧',
        },
        demo: ['C4', 'D4', 'C4', 'E4', 'C4', 'G4'],
        practica: [{ n: 'C4' }, { n: 'D4' }, { n: 'C4' }, { n: 'E4' }, { n: 'C4' }, { n: 'G4' }],
        evaluacion: [
          { n: 'C4' },
          { n: 'E4' },
          { n: 'C4' },
          { n: 'G4' },
          { n: 'C4' },
          { n: 'D4' },
          { n: 'C4' },
          { n: 'G4' },
        ],
      },
    ],
  },
  {
    id: 'may',
    nombre: 'Acordes mayores',
    libres: 2,
    emoji: '🎸',
    color: '#1DD1A1',
    desc: 'Tres notas juntas que suenan alegres',
    lecciones: [
      {
        id: 'a1',
        nombre: '¿Qué es un acorde?',
        emoji: '🧩',
        explicacion: {
          titulo: 'Tres notas al mismo tiempo',
          texto:
            'Un <b>acorde</b> son tres notas tocadas juntas. Se arma con la nota base (la <b>tónica</b>), la que está una <b>tercera</b> arriba, y la que está una <b>quinta</b> arriba.',
          tip: '¿Te acordás de Do-Mi-Sol de la lección del canguro? ¡Ese es el acorde de Do! 🦘',
        },
        demo: ['C4', 'E4', 'G4'],
        practica: [
          { n: 'C4', pista: 'Tónica' },
          { n: 'E4', pista: 'Tercera' },
          { n: 'G4', pista: 'Quinta' },
          { acorde: ['C4', 'E4', 'G4'], pista: '¡Ahora las tres juntas!' },
        ],
        evaluacion: [{ n: 'C4' }, { n: 'E4' }, { n: 'G4' }, { acorde: ['C4', 'E4', 'G4'] }],
      },
      {
        id: 'a2',
        nombre: 'Do mayor',
        emoji: '🔴',
        explicacion: {
          titulo: 'El acorde más fácil',
          texto:
            '<b>Do mayor</b> se toca con los dedos <b>1, 3 y 5</b> sobre Do, Mi y Sol. Es el primer acorde que aprende todo el mundo.',
          tip: 'Bajá los tres dedos al mismo tiempo, como si fuera un solo movimiento ✊',
        },
        demo: ['C4', 'E4', 'G4'],
        practica: [
          { acorde: ['C4', 'E4', 'G4'], pista: 'Do mayor: dedos 1, 3 y 5' },
          { acorde: ['C4', 'E4', 'G4'] },
        ],
        evaluacion: [{ acorde: ['C4', 'E4', 'G4'] }, { acorde: ['C4', 'E4', 'G4'] }],
      },
      {
        id: 'a3',
        nombre: 'Fa y Sol mayor',
        emoji: '🟢',
        explicacion: {
          titulo: 'Los dos compañeros del Do',
          texto:
            '<b>Fa mayor</b> es Fa-La-Do y <b>Sol mayor</b> es Sol-Si-Re. Junto con Do mayor, son los tres acordes que aparecen en miles de canciones.',
          tip: 'Con estos tres acordes ya podés acompañar un montón de temas 🎉',
        },
        demo: ['F4', 'A4', 'C5', 'G4', 'B4', 'D5'],
        practica: [
          { acorde: ['F4', 'A4', 'C5'], pista: 'Fa mayor' },
          { acorde: ['G4', 'B4', 'D5'], pista: 'Sol mayor' },
        ],
        evaluacion: [{ acorde: ['F4', 'A4', 'C5'] }, { acorde: ['G4', 'B4', 'D5'] }],
      },
      {
        id: 'a4',
        nombre: 'Más acordes mayores',
        emoji: '🌈',
        explicacion: {
          titulo: 'Re, Mi, La y Si',
          texto:
            'Todos los acordes mayores se arman igual: tónica, tercera y quinta. Cambia la nota de la que salís, pero la forma de la mano es parecida.',
          tip: 'Algunos usan teclas negras. Está bien, son parte del piano igual 🎹',
        },
        demo: ['D4', 'F#4', 'A4', 'E4', 'G#4', 'B4'],
        practica: [
          { acorde: ['D4', 'F#4', 'A4'], pista: 'Re mayor' },
          { acorde: ['E4', 'G#4', 'B4'], pista: 'Mi mayor' },
          { acorde: ['A4', 'C#5', 'E5'], pista: 'La mayor' },
        ],
        evaluacion: [
          { acorde: ['D4', 'F#4', 'A4'] },
          { acorde: ['E4', 'G#4', 'B4'] },
          { acorde: ['A4', 'C#5', 'E5'] },
        ],
      },
      {
        id: 'a5',
        nombre: 'Encadenar acordes',
        emoji: '🔗',
        explicacion: {
          titulo: 'Do → Fa → Sol → Do',
          texto:
            'Ahora vamos a <b>encadenarlos</b>: tocar uno después de otro sin parar. Esta secuencia es la más usada de la música popular.',
          tip: 'Escuchá: cuando volvés al Do al final, suena a "listo, terminó" 🏁',
        },
        demo: ['C4', 'E4', 'G4', 'F4', 'A4', 'C5', 'G4', 'B4', 'D5', 'C4', 'E4', 'G4'],
        practica: [
          { acorde: ['C4', 'E4', 'G4'], pista: 'Do' },
          { acorde: ['F4', 'A4', 'C5'], pista: 'Fa' },
          { acorde: ['G4', 'B4', 'D5'], pista: 'Sol' },
          { acorde: ['C4', 'E4', 'G4'], pista: 'Y volvemos a Do' },
        ],
        evaluacion: [
          { acorde: ['C4', 'E4', 'G4'] },
          { acorde: ['F4', 'A4', 'C5'] },
          { acorde: ['G4', 'B4', 'D5'] },
          { acorde: ['C4', 'E4', 'G4'] },
        ],
      },
    ],
  },
  {
    id: 'men',
    nombre: 'Acordes menores',
    libres: 1,
    emoji: '🎻',
    color: '#A29BFE',
    desc: 'Los acordes que suenan tristes',
    lecciones: [
      {
        id: 'm1',
        nombre: 'Mayor o menor',
        emoji: '🎭',
        explicacion: {
          titulo: 'Un solo dedo cambia todo',
          texto:
            'Si en un acorde mayor bajás <b>la nota del medio</b> a la tecla negra de al lado, se convierte en <b>menor</b>. <b>Do-Mi-Sol</b> es mayor. <b>Do-Re#-Sol</b> es menor.',
          tip: 'Los mayores suenan alegres 😀 y los menores suenan tristes 😢. ¡Escuchá la diferencia!',
        },
        demo: ['C4', 'E4', 'G4', 'C4', 'D#4', 'G4'],
        practica: [
          { acorde: ['C4', 'E4', 'G4'], pista: 'Do mayor: alegre' },
          { acorde: ['C4', 'D#4', 'G4'], pista: 'Do menor: triste. Sólo bajó el dedo del medio' },
        ],
        evaluacion: [{ acorde: ['C4', 'E4', 'G4'] }, { acorde: ['C4', 'D#4', 'G4'] }],
      },
      {
        id: 'm2',
        nombre: 'La menor y Mi menor',
        emoji: '🌙',
        explicacion: {
          titulo: 'Los menores más usados',
          texto:
            '<b>La menor</b> es La-Do-Mi y <b>Mi menor</b> es Mi-Sol-Si. Los dos se tocan sólo con teclas blancas.',
          tip: 'La menor es el "hermano triste" de Do mayor: usan las mismas notas del teclado 🤝',
        },
        demo: ['A4', 'C5', 'E5', 'E4', 'G4', 'B4'],
        practica: [
          { acorde: ['A4', 'C5', 'E5'], pista: 'La menor' },
          { acorde: ['E4', 'G4', 'B4'], pista: 'Mi menor' },
        ],
        evaluacion: [{ acorde: ['A4', 'C5', 'E5'] }, { acorde: ['E4', 'G4', 'B4'] }],
      },
      {
        id: 'm3',
        nombre: 'Más acordes menores',
        emoji: '🌌',
        explicacion: {
          titulo: 'Re, Sol y Si menor',
          texto:
            'Igual que con los mayores, cada nota tiene su acorde menor. La regla es siempre la misma: tónica, tercera <b>bajada</b> y quinta.',
          tip: 'Si te sale el mayor, el menor es bajar un solo dedo. Nada más 👇',
        },
        demo: ['D4', 'F4', 'A4', 'G4', 'A#4', 'D5'],
        practica: [
          { acorde: ['D4', 'F4', 'A4'], pista: 'Re menor' },
          { acorde: ['G4', 'A#4', 'D5'], pista: 'Sol menor' },
          { acorde: ['B4', 'D5', 'F#5'], pista: 'Si menor' },
        ],
        evaluacion: [
          { acorde: ['D4', 'F4', 'A4'] },
          { acorde: ['G4', 'A#4', 'D5'] },
          { acorde: ['B4', 'D5', 'F#5'] },
        ],
      },
      {
        id: 'm4',
        nombre: '¿Alegre o triste?',
        emoji: '👂',
        explicacion: {
          titulo: 'Prueba de oído',
          texto:
            'Última prueba del módulo. Vas a escuchar acordes mayores y menores mezclados, y los vas a repetir. Prestá atención al <b>color</b> de cada uno.',
          tip: 'No mires el teclado en la demostración: escuchá 🎧',
        },
        demo: ['C4', 'E4', 'G4', 'A4', 'C5', 'E5', 'F4', 'A4', 'C5', 'D4', 'F4', 'A4'],
        practica: [
          { acorde: ['C4', 'E4', 'G4'], pista: '¿Alegre o triste?' },
          { acorde: ['A4', 'C5', 'E5'], pista: '¿Y este?' },
          { acorde: ['F4', 'A4', 'C5'] },
          { acorde: ['D4', 'F4', 'A4'] },
        ],
        evaluacion: [
          { acorde: ['C4', 'E4', 'G4'] },
          { acorde: ['A4', 'C5', 'E5'] },
          { acorde: ['F4', 'A4', 'C5'] },
          { acorde: ['D4', 'F4', 'A4'] },
          { acorde: ['E4', 'G4', 'B4'] },
          { acorde: ['G4', 'B4', 'D5'] },
        ],
      },
    ],
  },
];
