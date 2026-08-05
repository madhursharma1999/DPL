// Franchises and commentary voices come from the DPL generator (backend
// MockLlmClient) so the game and the channel share one universe.
//
// The squad, however, is entirely invented. The generator's roster is built from
// near-miss spellings of real cricketers, which is fine for a script the creator
// performs but not for a published game: names that are recognisably a real
// person carry personality-rights exposure. These are original characters.

export const TEAMS = [
  { id: 'GG', name: 'Gully Gladiators', city: 'Ghaziabad',   color: '#e63946', tagline: 'Gali ke sher, maidan ke shikari' },
  { id: 'DD', name: 'Dhakkan Dynamos',  city: 'Dhanbad',     color: '#457b9d', tagline: 'Har over mein dhamaka' },
  { id: 'TT', name: 'Tapri Titans',     city: 'Tapri Nagar', color: '#2a9d8f', tagline: 'Chai garam, khel naram nahi' },
  { id: 'CC', name: 'Chai Chargers',    city: 'Chandni Chowk', color: '#e76f51', tagline: 'Ek cutting, poora winning' },
  { id: 'NN', name: 'Nukkad Ninjas',    city: 'Nagpur',      color: '#6a4c93', tagline: 'Chupke se chhakka' },
  { id: 'BB', name: 'Bottle Blasters',  city: 'Bhopal',      color: '#f4a261', tagline: 'Dhakkan khula, match khula' },
  { id: 'SS', name: 'Sasta Strikers',   city: 'Surat',       color: '#1d3557', tagline: 'Kam budget, zyada dum' },
  { id: 'JJ', name: 'Jugaad Jaguars',   city: 'Jaipur',      color: '#e9c46a', tagline: 'Jugaad hai toh jeet hai' },
];

// Nickname + speciality, the way gully teams actually name each other. Kept short
// so "batter vs bowler" fits the HUD line on a narrow phone.
export const PLAYERS = [
  'Chintu Chhakka', 'Bablu Boundary', 'Sonu Slogger', 'Guddu Glance',
  'Lallan Late-Cut', 'Pappu Powerplay', 'Dabbu Defence', 'Raju Rocket',
  'Tinku Tippy', 'Munna Muscle', 'Kaka Kalakaar', 'Bunty Bulldozer',
];

export const BOWLERS = [
  'Toofan Tiwari', 'Golu Googly', 'Chakkar Chacha', 'Bijli Bansal', 'Doosra Dubey',
];

// Fielding slots, polar around the batter. a = degrees (0 = straight down the
// ground, + = off side), r = fraction of the distance to the rope on that ray.
export const FIELD_SLOTS = [
  { n: 'Long On',    a: -18, r: 0.92 },
  { n: 'Long Off',   a:  22, r: 0.90 },
  { n: 'Midwicket',  a: -58, r: 0.74 },
  { n: 'Cover',      a:  56, r: 0.72 },
  { n: 'Square Leg', a: -98, r: 0.66 },
  { n: 'Point',      a:  96, r: 0.64 },
  { n: 'Fine Leg',   a: -142, r: 0.82 },
  { n: 'Third Man',  a:  144, r: 0.80 },
  { n: 'Keeper',     a:  180, r: 0.55 },
];

const A = 'Akash Bhai';
const C = 'Colonel Dhakkan';

// Text-only commentary: the game has to read the same with the sound off, which
// is how most of the YouTube feed plays it.
export const COMMENTARY = {
  SIX: [
    [A, 'CHHAKKAA! Dhakkan seedha padosi ke chhat pe!'],
    [A, 'Uthaya... aur gaya! Six, bilkul six!'],
    [C, 'Cap ne gravity se resign kar diya. Chhakka.'],
    [A, 'Arre baap re, marble ko passport mil gaya!'],
  ],
  FOUR: [
    [A, 'Chaar run! Rope tak bina ruke!'],
    [C, 'Timing theek thi. Fielder ka mann nahi tha. Chaar.'],
    [A, 'Gap dhoond liya, boundary mil gayi!'],
  ],
  TWO: [
    [A, 'Do run mil gaye, daudo bhai daudo!'],
    [C, 'Do run. Mehnat zyada, inaam kam.'],
  ],
  ONE: [
    [C, 'Ek run. Strike rotate ho gayi, drama nahi hua.'],
    [A, 'Single le liya, pressure thoda kam!'],
  ],
  FIELDED: [
    [C, 'Fielder ne rok liya. Ek run, bas itna hi.'],
    [A, 'Seedha fielder ke paas! Gap dhoondo bhai!'],
    [C, 'Achhi timing, galat address. Single.'],
  ],
  DOT: [
    [C, 'Dot ball. Cap hila, marble nahi.'],
    [A, 'Kuch nahi hua! Pressure bad raha hai!'],
  ],
  CAUGHT: [
    [A, 'CATCH! Seedha haath mein! Kya kar diya!'],
    [C, 'Hawa mein bheja, fielder ne courier accept kar liya.'],
  ],
  BOWLED: [
    [A, 'BOWLED! Marble ne dhakkan ko poochha bhi nahi!'],
    [C, 'Cap ghooma, marble nikal gaya. Stumps gir gaye.'],
  ],
  START: [
    [A, 'Toss ho gaya, dhakkan chamak rahe hain, chalo shuru!'],
    [C, 'Pitch: farsh. Weather: pankha. Khel shuru.'],
  ],
  WIN: [
    [A, 'JEET GAYE! Dhakkan Premier League ka naya hero!'],
    [C, 'Target chase ho gaya. Colonel impressed hai, thoda.'],
  ],
  LOSE: [
    [C, 'Target door reh gaya. Chai peeke wapas aao.'],
    [A, 'Haar gaye, par dhakkan toota nahi! Phir se!'],
  ],
};

export const pick = (arr) => arr[(Math.random() * arr.length) | 0];
