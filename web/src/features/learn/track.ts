/**
 * The learn track content — static on purpose. There is no per-patient
 * variation yet, so shipping the catalogue with the app keeps the loop fast;
 * only *progress* lives on the server, keyed by these lesson slugs. When
 * goal-based skill trees arrive, this moves behind the API and the stored
 * slugs survive the move.
 */

export type LessonStep =
  | { kind: "info"; title: string; body: string; emoji: string }
  | {
      kind: "choice";
      prompt: string;
      options: string[];
      correctIndex: number;
      /** Shown after answering — teaches whether they got it right or not. */
      explanation: string;
    };

export interface Lesson {
  /** Slug — the key lesson progress is stored under on the server. */
  id: string;
  title: string;
  blurb: string;
  steps: LessonStep[];
}

export interface Unit {
  id: string;
  title: string;
  emoji: string;
  blurb: string;
  lessons: Lesson[];
}

export const TRACK_TITLE = "Foundations of Healthy Living";

/* ------------------------------------------------------------------ track */

export const TRACK: Unit[] = [
  {
    id: "sleep",
    title: "Sleep",
    emoji: "🌙",
    blurb: "Good days start the night before.",
    lessons: [
      {
        id: "sleep-wind-down",
        title: "Wind down right",
        blurb: "Why the hour before bed matters",
        steps: [
          {
            kind: "info",
            emoji: "🌙",
            title: "The hour before bed",
            body: "Sleep doesn't start when your head hits the pillow. It starts with how you spend the hour before. A calm wind-down tells your body the day is done.",
          },
          {
            kind: "info",
            emoji: "💡",
            title: "Melatonin, your sleep signal",
            body: "As the evening darkens, your body releases melatonin — the hormone that makes you feel sleepy. Bright light holds it back, and bed feels further away.",
          },
          {
            kind: "choice",
            prompt: "What does bright light in the evening do?",
            options: [
              "Helps you nod off faster",
              "Suppresses melatonin, so you feel less sleepy",
              "Makes no difference to sleep",
              "Improves your dreams",
            ],
            correctIndex: 1,
            explanation:
              "Bright light — especially from screens — suppresses melatonin, the hormone that makes you feel sleepy. Dimmer light in the evening lets it rise.",
          },
          {
            kind: "info",
            emoji: "📱",
            title: "Screens are the big one",
            body: "Phones, tablets and tellies shine bright light straight into your eyes, and scrolling keeps the mind whirring. Try putting screens away an hour before bed.",
          },
          {
            kind: "choice",
            prompt: "Which light helps melatonin rise in the evening?",
            options: [
              "Bright overhead lights",
              "Your phone at full brightness",
              "Low, warm lamplight",
              "Light makes no difference",
            ],
            correctIndex: 2,
            explanation:
              "Low, warm light lets melatonin build. Swapping the big light for a lamp after dinner is one of the easiest sleep wins there is.",
          },
          {
            kind: "choice",
            prompt: "It's an hour before bed. Which is the best wind-down?",
            options: [
              "Catch up on the news on your phone",
              "Dim the lights and read or listen to something gentle",
              "The telly on, lights up bright",
              "A strong cup of tea",
            ],
            correctIndex: 1,
            explanation:
              "Low light and something calm — a book, the radio, a bath — lets melatonin rise so sleep comes more easily.",
          },
          {
            kind: "info",
            emoji: "✨",
            title: "Small change, big win",
            body: "You don't need a perfect routine. Dim the lights, park the phone, and let the evening slow down. Your morning self will thank you.",
          },
        ],
      },
      {
        id: "sleep-rhythm",
        title: "Protect your rhythm",
        blurb: "Consistent times and a caffeine cutoff",
        steps: [
          {
            kind: "info",
            emoji: "⏰",
            title: "Your body loves a rhythm",
            body: "Your body runs on an internal clock. Going to bed and getting up at roughly the same times — weekends too — keeps that clock steady, so sleep comes more easily.",
          },
          {
            kind: "choice",
            prompt: "What helps your body clock most?",
            options: [
              "Lying in at weekends to catch up",
              "Consistent sleep and wake times, even at weekends",
              "Going to bed whenever you feel like it",
              "An afternoon nap every day",
            ],
            correctIndex: 1,
            explanation:
              "A steady rhythm beats catch-up sleep. Keeping the same times, even at weekends, is one of the most powerful sleep habits there is.",
          },
          {
            kind: "info",
            emoji: "☕",
            title: "Caffeine hangs about",
            body: "Caffeine stays in your body for hours — half of it can still be with you six hours on. A late cuppa can quietly nibble at your night.",
          },
          {
            kind: "choice",
            prompt: "You'd like to be asleep by 11pm. When's a sensible last coffee?",
            options: [
              "Around 3pm",
              "With dinner at 8pm",
              "9pm, if it's only a small one",
              "Caffeine doesn't affect sleep",
            ],
            correctIndex: 0,
            explanation:
              "A cutoff of roughly eight hours before bed — mid-afternoon for most people — gives caffeine time to fade. Tea and cola count too.",
          },
          {
            kind: "choice",
            prompt: "You slept badly last night. What's the best move?",
            options: [
              "A long lie-in to catch up",
              "Get up at your usual time and keep the rhythm",
              "Extra coffee after dinner",
              "A nap in the evening",
            ],
            correctIndex: 1,
            explanation:
              "Tempting as a lie-in is, keeping your usual wake time protects the rhythm — and makes tonight's sleep deeper for it.",
          },
          {
            kind: "info",
            emoji: "🌅",
            title: "Morning light helps too",
            body: "Daylight soon after waking sets your clock for the whole day. A few minutes outside does the trick — a morning walk counts twice.",
          },
        ],
      },
    ],
  },
  {
    id: "protein",
    title: "Protein",
    emoji: "💪",
    blurb: "The building blocks of strength.",
    lessons: [
      {
        id: "protein-why",
        title: "Why protein matters",
        blurb: "Muscle, fullness and staying strong",
        steps: [
          {
            kind: "info",
            emoji: "💪",
            title: "More than muscle",
            body: "Protein builds and repairs nearly everything — muscle, skin, bones, even your immune system. Your body can't store it, so it needs a steady supply.",
          },
          {
            kind: "info",
            emoji: "🧭",
            title: "Use it or lose it",
            body: "From mid-life we naturally start losing muscle. That makes stairs harder and falls more likely. Eating enough protein slows that right down.",
          },
          {
            kind: "choice",
            prompt: "Why does protein matter more as we get older?",
            options: [
              "It doesn't — we need less with age",
              "We naturally lose muscle from mid-life, and protein helps slow it",
              "It's only for bodybuilders",
              "It replaces the need for exercise",
            ],
            correctIndex: 1,
            explanation:
              "Muscle quietly slips away from our 40s onwards. Enough protein — paired with a bit of strength work — keeps you steady on your feet for years longer.",
          },
          {
            kind: "info",
            emoji: "🍳",
            title: "It keeps you full",
            body: "Protein is the most filling thing on your plate. A proper protein breakfast — eggs, yoghurt, beans — makes mid-morning snacking far less tempting.",
          },
          {
            kind: "choice",
            prompt: "Which breakfast keeps you full for longest?",
            options: [
              "White toast with jam",
              "A sugary cereal",
              "Eggs on wholemeal toast",
              "Just a coffee",
            ],
            correctIndex: 2,
            explanation:
              "Eggs bring protein and wholemeal toast brings fibre — a filling pair. Sugary starts burn off fast and leave you peckish by eleven.",
          },
          {
            kind: "choice",
            prompt: "Which of these is a good source of protein?",
            options: ["Lentils", "Lettuce", "Boiled sweets", "Butter"],
            correctIndex: 0,
            explanation:
              "Beans and lentils are terrific — protein and fibre together. Lettuce is lovely, but there's barely any protein in it.",
          },
          {
            kind: "info",
            emoji: "🌱",
            title: "Protein is everywhere",
            body: "Meat and fish, yes — but also eggs, yoghurt, milk, beans, lentils, tofu and nuts. Plenty of choice, whatever's usually on your plate.",
          },
        ],
      },
      {
        id: "protein-target",
        title: "Hitting your number",
        blurb: "What 2.2 g per kg looks like in food",
        steps: [
          {
            kind: "info",
            emoji: "🎯",
            title: "Your daily target",
            body: "For active adults, a good target is about 2.2 grams of protein per kilogram of body weight, every day. It sounds a lot — and most of us eat well under it.",
          },
          {
            kind: "choice",
            prompt: "You weigh 70 kg. Roughly how much protein a day is the target?",
            options: ["About 50 g", "About 100 g", "About 154 g", "About 250 g"],
            correctIndex: 2,
            explanation:
              "70 kg × 2.2 g comes to roughly 154 g a day. That's the target for active adults — spread across the day, not squeezed into one meal.",
          },
          {
            kind: "info",
            emoji: "🍽️",
            title: "What that looks like",
            body: "A chicken breast is about 30 g. A tin of tuna about 25 g. Two eggs about 12 g. A pot of Greek yoghurt about 15 g. It adds up — but only if you plan for it.",
          },
          {
            kind: "info",
            emoji: "⏱️",
            title: "Spread it out",
            body: "Your body uses protein best in steady helpings. Aim for a decent portion at every meal — breakfast included — rather than one enormous dinner.",
          },
          {
            kind: "choice",
            prompt: "What's the best way to hit a daily protein target?",
            options: [
              "One huge steak at dinner",
              "A good portion of protein at every meal",
              "Protein only on exercise days",
              "Skipping meals and having shakes",
            ],
            correctIndex: 1,
            explanation:
              "Spreading protein across the day gives your muscles a steady supply to build with. Every meal is a chance to chip in.",
          },
          {
            kind: "info",
            emoji: "🩺",
            title: "One caveat",
            body: "A target this high suits active adults. If you have kidney disease, or you're not sure, have a word with your GP before pushing your protein up.",
          },
        ],
      },
    ],
  },
  {
    id: "fibre",
    title: "Fibre",
    emoji: "🥦",
    blurb: "Feed the good bugs.",
    lessons: [
      {
        id: "fibre-effect",
        title: "The fibre effect",
        blurb: "Your gut, your heart and 30 g a day",
        steps: [
          {
            kind: "info",
            emoji: "🥦",
            title: "The quiet hero",
            body: "Fibre is the part of plants we can't digest — and that's exactly why it's brilliant. It keeps your gut moving and feeds the good bacteria living there.",
          },
          {
            kind: "info",
            emoji: "🦠",
            title: "Your gut microbiome",
            body: "Trillions of friendly bacteria live in your gut. Feed them fibre and they repay you: smoother digestion, a stronger immune system, even a steadier mood.",
          },
          {
            kind: "choice",
            prompt: "What does fibre do for your gut bacteria?",
            options: [
              "Kills them off",
              "Feeds the helpful ones",
              "Nothing — bacteria are bad news",
              "Sends them to sleep",
            ],
            correctIndex: 1,
            explanation:
              "Fibre is what your good gut bacteria eat. A well-fed microbiome helps digestion, immunity and even mood.",
          },
          {
            kind: "info",
            emoji: "❤️",
            title: "Fibre and cholesterol",
            body: "Some fibre — the kind in oats, beans and fruit — binds to cholesterol and carries it out of the body. A daily bowl of porridge genuinely helps your heart.",
          },
          {
            kind: "choice",
            prompt: "How much fibre should adults aim for each day?",
            options: ["About 10 g", "About 30 g", "About 80 g", "There's no target"],
            correctIndex: 1,
            explanation:
              "The target is about 30 g a day. Most of us manage under 20 g, so there's easy ground to gain — a swap or two does it.",
          },
          {
            kind: "info",
            emoji: "🐢",
            title: "Go gently",
            body: "If fibre is new to you, build up slowly and drink plenty of water. Your gut prefers a gradual change to a sudden one.",
          },
        ],
      },
      {
        id: "fibre-daily",
        title: "Fibre every day",
        blurb: "Easy swaps and plenty of plants",
        steps: [
          {
            kind: "info",
            emoji: "🔄",
            title: "Easy swaps",
            body: "You don't need new recipes — just swaps. White bread to wholemeal. White rice to brown. Cornflakes to porridge. Same meals, more fibre.",
          },
          {
            kind: "choice",
            prompt: "Which swap adds the most fibre?",
            options: [
              "Butter to margarine",
              "White bread to wholemeal",
              "Tea to coffee",
              "Chips to mash",
            ],
            correctIndex: 1,
            explanation:
              "Wholemeal keeps the fibre-rich outer layer of the grain that white bread loses. Brown rice and wholewheat pasta work the same way.",
          },
          {
            kind: "info",
            emoji: "🫘",
            title: "Beans are a shortcut",
            body: "Beans and lentils are packed with fibre and protein at once. A tin of baked beans carries around 10 g of fibre — a third of your day in one go.",
          },
          {
            kind: "info",
            emoji: "🌈",
            title: "Variety counts",
            body: "Different plants feed different gut bacteria. Aim for variety across the week — fruit, veg, beans, nuts, seeds and whole grains all count.",
          },
          {
            kind: "choice",
            prompt: "What matters most for a happy gut microbiome?",
            options: [
              "Eating one 'superfood' every day",
              "A wide variety of plants across the week",
              "Cutting out all carbs",
              "Only eating raw vegetables",
            ],
            correctIndex: 1,
            explanation:
              "There's no single magic food. A wide mix of plants across the week feeds the widest mix of good bacteria.",
          },
          {
            kind: "info",
            emoji: "🥣",
            title: "Start tomorrow",
            body: "Porridge with berries. Beans with lunch. A handful of nuts. Three small moves and you're most of the way to 30 g.",
          },
        ],
      },
    ],
  },
  {
    id: "water",
    title: "Water",
    emoji: "💧",
    blurb: "Little and often — then ease off at night.",
    lessons: [
      {
        id: "water-enough",
        title: "Drink enough",
        blurb: "How much, and how to tell you're low",
        steps: [
          {
            kind: "info",
            emoji: "💧",
            title: "Your body runs on water",
            body: "You're over half water. Digestion, temperature, joints, concentration — everything works better topped up.",
          },
          {
            kind: "choice",
            prompt: "Roughly how much fluid should most adults drink a day?",
            options: [
              "1–2 glasses",
              "6–8 glasses",
              "15 glasses or more",
              "Only when it's hot out",
            ],
            correctIndex: 1,
            explanation:
              "About 6–8 glasses a day suits most people. Tea, coffee and milk all count towards it too.",
          },
          {
            kind: "info",
            emoji: "🕰️",
            title: "Thirst lags behind",
            body: "By the time you feel thirsty, you're already a little dehydrated — and the signal gets quieter with age. Sipping through the day beats waiting for thirst.",
          },
          {
            kind: "info",
            emoji: "🚦",
            title: "Signs you're running low",
            body: "A headache, feeling tired or foggy, and dark yellow wee are all early signs. Pale straw-coloured wee means you're doing fine.",
          },
          {
            kind: "choice",
            prompt: "Which is an early sign of dehydration?",
            options: [
              "Pale-coloured wee",
              "A headache and feeling foggy",
              "Feeling full of energy",
              "Cold hands",
            ],
            correctIndex: 1,
            explanation:
              "Headaches, tiredness and dark wee are the classic early signs — and a glass of water is often the fix.",
          },
          {
            kind: "info",
            emoji: "🫖",
            title: "Make it easy",
            body: "Keep a glass by the kettle and drink one whenever it boils. A bottle by your chair works too. Little and often wins.",
          },
        ],
      },
      {
        id: "water-timing",
        title: "Time it right",
        blurb: "Front-load the day, protect the night",
        steps: [
          {
            kind: "info",
            emoji: "⏳",
            title: "When matters too",
            body: "Drinking enough is half the job. When you drink it is the other half — plenty through the day, then ease off as the evening goes on.",
          },
          {
            kind: "info",
            emoji: "🌙",
            title: "Don't let water wake you",
            body: "Remember the sleep unit? Getting up in the night chops your sleep into pieces — and a late glass of water is the most common reason. Try to stop drinking a few hours before bedtime.",
          },
          {
            kind: "choice",
            prompt: "Why ease off drinks in the late evening?",
            options: [
              "Water is less healthy at night",
              "So a full bladder doesn't interrupt your sleep",
              "Your body can't absorb water after dark",
              "To save on washing up",
            ],
            correctIndex: 1,
            explanation:
              "Night-time loo trips break up the sleep rhythm you've worked to protect. Stopping drinks a few hours before bed keeps the night whole.",
          },
          {
            kind: "choice",
            prompt: "Which routine sets you up best?",
            options: [
              "Most of your drinks before mid-evening, then just sips",
              "A pint of water right at bedtime",
              "Nothing all day, catch up at night",
              "Only drinking with meals",
            ],
            correctIndex: 0,
            explanation:
              "Drink freely through the morning and afternoon, then taper off. If your mouth is dry at bedtime, a small sip is fine.",
          },
          {
            kind: "info",
            emoji: "☀️",
            title: "A good day, drawn out",
            body: "A glass when you wake. Steady sips until tea-time. Ease off after dinner. Sleep straight through. That's the shape of it.",
          },
        ],
      },
    ],
  },
  {
    id: "movement",
    title: "Movement",
    emoji: "🚶",
    blurb: "Anything that gets you moving counts.",
    lessons: [
      {
        id: "move-daily",
        title: "Every move counts",
        blurb: "150 minutes a week, any way you like",
        steps: [
          {
            kind: "info",
            emoji: "🚶",
            title: "Any movement beats none",
            body: "You don't need a gym or lycra. Walking to the shops, gardening, dancing in the kitchen — it all counts, and it all helps.",
          },
          {
            kind: "info",
            emoji: "📊",
            title: "The weekly target",
            body: "The aim is about 150 minutes of moderate movement a week — enough to feel warmer and breathe a bit harder while still holding a chat.",
          },
          {
            kind: "choice",
            prompt: "How much moderate movement is recommended each week?",
            options: [
              "30 minutes",
              "150 minutes",
              "10 hours",
              "It only counts if it's running",
            ],
            correctIndex: 1,
            explanation:
              "About 150 minutes a week — say 30 minutes, five days a week. Brisk walking counts, and you can split it into ten-minute chunks.",
          },
          {
            kind: "choice",
            prompt: "Which of these counts as moderate movement?",
            options: [
              "A brisk walk with your pod",
              "Only jogging or faster",
              "Sitting out in the garden",
              "It has to leave you exhausted",
            ],
            correctIndex: 0,
            explanation:
              "Moderate means warmer and breathing harder, but still able to talk. A brisk walk, a gentle bike ride, pushing a mower — all of it counts.",
          },
          {
            kind: "info",
            emoji: "🧩",
            title: "Stack it into your day",
            body: "Ten minutes here and there adds up. Get off the bus a stop early. Take the stairs. Walk while you natter on the phone.",
          },
          {
            kind: "info",
            emoji: "🤝",
            title: "Better together",
            body: "Moving with other people is the easiest way to keep it up — which is rather the point of your pod. Book the next walk and the minutes take care of themselves.",
          },
        ],
      },
      {
        id: "move-strength",
        title: "Strength twice a week",
        blurb: "Why muscles need more than walking",
        steps: [
          {
            kind: "info",
            emoji: "🏋️",
            title: "Not just walking",
            body: "Walking looks after your heart. Strength work looks after your muscles and bones — and it's the half most of us skip.",
          },
          {
            kind: "info",
            emoji: "💪",
            title: "Remember your protein?",
            body: "Strength work and protein are a team. Exercise sends the signal to build muscle; protein supplies the bricks. You need both.",
          },
          {
            kind: "choice",
            prompt: "How often should adults do strength exercises?",
            options: [
              "Only if you're under 40",
              "Once a month",
              "At least twice a week",
              "Every single day, flat out",
            ],
            correctIndex: 2,
            explanation:
              "Twice a week is the target. Muscles like a rest day between sessions to rebuild — that's when they get stronger.",
          },
          {
            kind: "choice",
            prompt: "Which of these is strength work?",
            options: [
              "Standing up from a chair ten times",
              "Watching the football",
              "A slow amble",
              "A long lie-down",
            ],
            correctIndex: 0,
            explanation:
              "Anything your muscles push or pull against counts — sit-to-stands, carrying shopping, climbing stairs, resistance bands, even tins of beans as weights.",
          },
          {
            kind: "info",
            emoji: "🦴",
            title: "Bones love it too",
            body: "Strength work loads your bones, and loaded bones stay dense. That means fewer breaks and steadier balance for years to come.",
          },
          {
            kind: "info",
            emoji: "🚀",
            title: "Start where you are",
            body: "Two short sessions a week. Sit-to-stands, wall presses, heel raises while the kettle boils. Small, steady, twice a week — that's the whole trick.",
          },
        ],
      },
    ],
  },
];

/* ---------------------------------------------------------------- helpers */

/** Every lesson in track order — the sequential-unlock path. */
export const allLessons = (): Lesson[] => TRACK.flatMap((unit) => unit.lessons);

export const findLesson = (id: string): Lesson | undefined =>
  allLessons().find((lesson) => lesson.id === id);
