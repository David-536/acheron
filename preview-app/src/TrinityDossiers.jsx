import { useState, useEffect, useCallback, useRef } from "react";

// Mobile detection hook
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isMobile;
}

const ATTR_LIST = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
const ATTR_FULL = { STR: "Strength", DEX: "Dexterity", CON: "Constitution", INT: "Intelligence", WIS: "Wisdom", CHA: "Charisma" };
const SKILL_MAP = {
  STR: ["Athletics", "Intimidation"],
  DEX: ["Acrobatics", "Disable Device", "Drive", "Sleight of Hand", "Stealth"],
  CON: ["Composure", "Endurance"],
  INT: ["Demolitions", "Forgery", "Investigation", "Knowledge", "Repair"],
  WIS: ["Craft", "First Aid", "Listen", "Occult", "Sense Motive", "Spot", "Survival"],
  CHA: ["Deception", "Perform", "Persuasion", "Primal Empathy"]
};
const SANITY_TYPES = ["Violence", "Morality", "Supernatural"];
const SP_PER_LEVEL = { STR: 3, DEX: 3, CON: 2, INT: 4, WIS: 3, CHA: 3 };
const ALL_SKILLS = ATTR_LIST.flatMap(attr => SKILL_MAP[attr].map(s => ({ name: s, key: s.replace(/\s/g, "_"), attr })));
const DEFAULT_SECTION_ORDER = ["identity", "attributes", "combat", "sanity", "skills", "merits", "abilities", "notes"];
const SECTION_TITLES = { identity: "IDENTIFICATION", attributes: "ATTRIBUTES", combat: "COMBAT & VITALS", sanity: "PSYCHOLOGICAL PROFILE", skills: "SKILLS ASSESSMENT", merits: "MERITS & FLAWS", abilities: "ABILITIES", notes: "FIELD NOTES" };

const WEAPON_PROPS = {
  "General": {
    "Arc": "Target an additional enemy within range per level of Arc. Enemies do not need to be adjacent. Split damage as you see fit.",
    "AP": "Armor Piercing — removes one stack of DR per AP level for the damage type dealt.",
    "Blacklist": "Only purchasable through the black market. May be stopped by authorities.",
    "Heavy": "Requires minimum 14 STR to use. Uses Strength to wield.",
    "Overt": "Cannot be hidden.",
    "Slick": "+4 to checks hiding this weapon on your person or in the environment.",
    "Spread": "Target an additional adjacent enemy per level of Spread. Split damage as you see fit.",
    "Stun": "Target gains Stunned status for rounds equal to Stun level.",
    "Unstable": "Critical failure range equals Unstable level (e.g. Unstable 3 = crit fail on 1-3).",
    "Unwieldy": "Requires minimum 16 STR. Uses Strength to wield. Must use two hands.",
  },
  "Ranged": {
    "Automatic": "Shoots rapidly. Allows Automatic Weapon Combat Maneuvers.",
    "Fixed": "Must use a Secondary Action to set up before firing.",
    "Jamless": "Cannot jam. Only fails on a natural 1 (misfire).",
    "Long Ranged": "No Attribute bonus to attack rolls when shooting within 30 ft.",
    "One-Handed": "Requires a Secondary Action to reload.",
    "Rapid Fire": "Attack a single target multiple times per round equal to Rapid Fire level (Standard Action).",
    "Rifle": "Innately has AP 1. Listed AP is total.",
    "Silent": "Makes negligible sound when fired.",
    "Two-Handed": "Requires a Standard Action to reload.",
  },
  "Melee": {
    "Entangling": "Allows you to Entangle enemies. Attack roll vs Strength Save.",
    "Finesse": "Uses Dexterity instead of Strength for attack and damage rolls.",
    "Reach": "Melee attack range of 10 feet.",
    "Thrown": "Balanced for throwing. Effective range 30 ft.",
    "Trip": "Allows you to Trip enemies, knocking them Prone. Attack roll vs Dexterity Save.",
  },
  "Effects": {
    "Bleed": "Add indicated stacks of Bleed to the target.",
    "Burn": "Add indicated stacks of Burn to the target.",
    "Poison": "Add indicated stacks of Poison to the target.",
  },
};
const ARMOR_PROPS = {
  "Blacklist": "Only purchasable through the black market. May be stopped by authorities.",
  "Heavy": "Requires minimum 14 STR to use.",
  "Overt": "Cannot be hidden.",
  "Unwieldy": "Requires minimum 16 STR to use.",
  "Slick": "+4 to checks involving hiding this armor on your person or in the environment.",
};
const ALL_WEAPON_PROPS = Object.entries(WEAPON_PROPS).flatMap(([cat, props]) => Object.entries(props).map(([name, desc]) => ({ name, desc, cat })));
const ALL_ARMOR_PROPS = Object.entries(ARMOR_PROPS).map(([name, desc]) => ({ name, desc }));

const ATTR_TIPS = {
  STR: "STRENGTH\n▸ Melee & thrown attack/damage (non-finesse)\n▸ Heavy ranged weapon attack rolls\n▸ Skills: Intimidation, Athletics\n▸ Heavy weapons: 14+ STR\n▸ Unwieldy weapons: 16+ STR\n▸ 3 SP/level as Primary or Secondary",
  DEX: "DEXTERITY\n▸ Evasion (10 + DEX mod)\n▸ Initiative modifier\n▸ Non-heavy ranged attack rolls\n▸ Finesse weapon attack/damage\n▸ Skills: Acrobatics, Stealth, Sleight of Hand, Drive, Disable Device\n▸ 3 SP/level as Primary or Secondary",
  CON: "CONSTITUTION\n▸ HP (base + CON mod)\n▸ Recovery Die healing bonus\n▸ Death threshold: negative HP = base health + CON mod\n▸ Psychic Energy pool uses CON score\n▸ Skills: Composure, Endurance\n▸ 2 SP/level as Primary or Secondary",
  INT: "INTELLIGENCE\n▸ Mana pool: INT score + Primary mod + Secondary mod\n▸ Highest SP value: 4 SP/level\n▸ Skills: Demolitions, Forgery, Investigation, Knowledge, Repair",
  WIS: "WISDOM\n▸ Sanity max: WIS × 5\n▸ Skills: Craft, First Aid, Listen, Occult, Sense Motive, Spot, Survival\n▸ 3 SP/level as Primary or Secondary",
  CHA: "CHARISMA\n▸ Pyromancy & Neuromancy CMRs use CHA mod\n▸ Skills: Deception, Perform, Persuasion, Primal Empathy\n▸ 3 SP/level as Primary or Secondary",
};
const STAT_TIPS = {
  HP: "HIT POINTS\n▸ Base: Race/Pedigree + CON modifier\n▸ Does NOT increase per level\n▸ Increase via: CON gains, Abilities, Merits\n▸ 0 HP → Critical Condition\n▸ Negative HP ≥ base + CON mod → Death",
  EVA: "EVASION\n▸ Attackers roll 1d20 + bonus ≥ your EVA to hit\n▸ Flanked (opposite sides): lose DEX bonus\n▸ Unaware (surprise/stealth): lose DEX bonus\n▸ Armor gives DR, not EVA",
  INIT: "INITIATIVE\n▸ Roll: 1d20 + this modifier\n▸ Highest goes first each round\n▸ Bonuses: Cunning Initiative (ability)\n▸ Mutations: Extra Eyes, Enhanced Ears (+1 each)\n▸ Status: Clarity (+2 per stack)",
  MOV: "MOVEMENT\n▸ Speed in feet per round (Secondary Action)\n▸ Run: Standard + Secondary = double speed\n▸ Applies to swimming & climbing too\n▸ Prone: +4 EVA vs ranged, −4 vs melee",
  REC: "RECOVERY DIE\n▸ Rolled on Long Rest: die + CON mod = HP healed\n▸ 1d4: Soulmender, Half-Leecher\n▸ 1d6: Most Humans, most Darkleechers\n▸ 1d8: War Born, Exalted, Demonic DL",
  DMG: "DAMAGE MODIFIER\n▸ Bonus damage from Abilities, Merits, etc.\n▸ Added beyond standard STR/DEX modifier",
  FTG: "FATIGUE\n▸ Lv1: No attribute bonus on skill checks\n▸ Lv2: No attribute bonus on abilities\n▸ Lv3: No bonus on passives (EVA, HP, PE) + no skill rank benefits\n▸ Lv4: Unconscious for 1d6 days\n▸ Lv5: Death\n▸ Cannot be reduced by Cleansed Mind/Body",
  MANA: "MANA POOL\n▸ Formula: INT Score + Primary Mod + Secondary Mod\n▸ Used to cast Arcane spells\n▸ Regen: Ley Line meditation (3/6/9 per hour by tier)\n▸ Within 10mi of Ley Line: −1 Mana cost per tier",
  PE: "PSYCHIC ENERGY\n▸ Formula: CON Score + Primary Mod + Total Mancy Levels\n▸ Max spend per ability = Total Mancy Levels\n▸ Recovery: Long Rest (Recovery Die + Mancy Levels)",
};

const SKILL_TIPS = {
  Athletics: "ATHLETICS (STR)\n▸ Climb, swim, jump, run, lift, scale, sprint\n▸ Contested vs. Athletics, Acrobatics, Endurance",
  Intimidation: "INTIMIDATION (STR)\n▸ Leverage strength/presence to frighten\n▸ Contested vs. Intimidation, Composure",
  Acrobatics: "ACROBATICS (DEX)\n▸ Flip, roll, tumble, dance, parkour\n▸ Contested vs. Athletics, Acrobatics, Endurance",
  "Disable Device": "DISABLE DEVICE (DEX)\n▸ Pick locks, disassemble traps, disable devices\n▸ Contested vs. Demolitions, Repair",
  Drive: "DRIVE (DEX)\n▸ Drive automobiles, sail small ships\n▸ Contested vs. Drive",
  "Sleight of Hand": "SLEIGHT OF HAND (DEX)\n▸ Steal, place, or palm items undetected\n▸ Contested vs. Sleight of Hand, Spot",
  Stealth: "STEALTH (DEX)\n▸ Move silently, stay out of sight\n▸ Contested vs. Investigation, Listen, Spot",
  Endurance: "ENDURANCE (CON)\n▸ Long distances, stay awake, push limits\n▸ Contested vs. Athletics, Acrobatics",
  Composure: "COMPOSURE (CON)\n▸ Keep wits under stress/interrogation\n▸ Contested vs. Intimidation, Investigation, Sense Motive",
  Demolitions: "DEMOLITIONS (INT)\n▸ Set up, create, disarm explosives\n▸ Contested vs. Disable Device, Demolitions",
  Forgery: "FORGERY (INT)\n▸ Forge documents, signatures, art\n▸ Contested vs. Forgery, Investigation",
  Investigation: "INVESTIGATION (INT)\n▸ Search areas, connect clues\n▸ Contested vs. Stealth, Composure, Forgery, Deception",
  Knowledge: "KNOWLEDGE (INT)\n▸ Specialized subject expertise\n▸ 26 types: Accounting, History, Law, Medicine, Psychology, Streetwise, etc.",
  Repair: "REPAIR (INT)\n▸ Mend machines, objects, Soulmender parts\n▸ Contested vs. Disable Device",
  Craft: "CRAFT (WIS)\n▸ Craft one class of item\n▸ Must specialize (armorer, gunsmith, etc.)\n▸ Contested varies by craft type",
  "First Aid": "FIRST AID (WIS)\n▸ Stop bleeding, slow poison, treat disease\n▸ DC 15 stabilizes someone at 0 HP\n▸ Contested vs. First Aid",
  Occult: "OCCULT (WIS)\n▸ Supernatural knowledge\n▸ Discern Spells & Rituals\n▸ Contested vs. Occult",
  Listen: "LISTEN (WIS)\n▸ Hear noises others overlook\n▸ Contested vs. Stealth, Deception",
  "Sense Motive": "SENSE MOTIVE (WIS)\n▸ Read body language, tone, attitude\n▸ Contested vs. Intimidation, Composure, Persuasion, Deception",
  Spot: "SPOT (WIS)\n▸ Visual details others miss\n▸ Contested vs. Stealth, Sleight of Hand",
  Survival: "SURVIVAL (WIS)\n▸ Track, hunt, scavenge, orient\n▸ Contested vs. Survival",
  Deception: "DECEPTION (CHA)\n▸ Disguise self & intentions\n▸ Lie, blend in via costume/subtlety\n▸ Contested vs. Investigation, Listen, Spot, Sense Motive",
  Perform: "PERFORM (CHA)\n▸ One feat: instrument, singing, fire dancing, etc.\n▸ Contested vs. Composure",
  Persuasion: "PERSUASION (CHA)\n▸ Diplomacy, charm, social cues\n▸ Contested vs. Composure, Sense Motive",
  "Primal Empathy": "PRIMAL EMPATHY (CHA)\n▸ Communicate with natural creatures\n▸ Pacify, enrage, or calm (wild & domestic)\n▸ Contested vs. Primal Empathy",
};

const OCCULT_DOMAINS = ["Arcane", "Fae", "Spirit", "Demonic", "Eldritch"];
const MANCY_TYPES = ["Pyromancy", "Cryomancy", "Telekinesis", "Magnetism", "Biomancy", "Necromancy", "Neuromancy", "Auramancy"];
const SPELL_TIERS = [1, 2, 3, 4, 5];
const MANCY_LEVELS = [1, 2, 3, 4, 5];

const RACES = {
  "Human": ["Human", "War Born", "Grey Blood", "Ellson House", "Gripe", "Exalted"],
  "Darkleecher": ["Fae", "Spirit", "Demonic", "Eldritch"],
  "Soulmender": [],
  "Half-Leecher": [],
};

const LANGUAGES = {
  "Government Approved": ["Standard", "Houndbable", "Cant", "Gold Tongue", "Grey Code"],
  "Statement of Indifference": ["Leecher", "Aregot", "Chitter", "Silver Tongue", "Dragon's Tongue"],
  "Illegal": ["Remorian", "E'Anga", "Demonic", "Eldritch"],
};

const BACKGROUND_TIERS = {
  "Minimal (Trained Skill)": { desc: "Getting started in your field.", backgrounds: ["High School Athlete", "Line Cook", "Medical Student", "Mystic", "Pick Pocket", "Student", "Investigative Assistant", "Go-Between"] },
  "Low (5 Ranks)": { desc: "Skilled in your chosen field.", backgrounds: ["College Athlete", "Junior Chef", "Medical Resident", "Magician", "Gambler", "Assistant", "Investigator", "Middle Man"] },
  "Moderate (10 Ranks)": { desc: "A true professional.", backgrounds: ["Professional Athlete", "Chef", "Physician", "Cultist", "Card Shark", "Researcher", "Detective", "Arbitrator"] },
  "High (15 Ranks)": { desc: "A true expert in your field.", backgrounds: ["Star Athlete", "Head Chef", "Medical Fellow", "Cult Leader", "Grifter", "Professor", "Junior Agent", "Advocate"] },
  "Extreme (20 Ranks)": { desc: "Recognized as a genius by peers.", backgrounds: ["All Star", "Executive Chef", "Medical Specialist", "Prophet", "Acquisitions Specialist", "Professor Emeritus", "Agent", "Diplomat"] },
};
const ALL_BACKGROUNDS = Object.values(BACKGROUND_TIERS).flatMap(t => t.backgrounds);
const getBackgroundTier = (bg) => Object.entries(BACKGROUND_TIERS).find(([_, t]) => t.backgrounds.includes(bg));

const COMBAT_REF = {
  "Basic Combat": [
    { name: "Attack Roll", desc: "1d20 + Attribute Mod (STR for melee/heavy ranged, DEX for finesse/most ranged) + bonuses ≥ target's EVA = hit. Not proficient with weapon: −4 penalty." },
    { name: "Damage", desc: "Roll weapon damage dice + Attribute Mod. DR then reduces: DR1 = ½ dmg, DR2 = ¼ dmg, DR3 = min dice (each die = 1), DR4 = immune (1 dmg per hit min)." },
    { name: "Critical Hit", desc: "Roll within weapon's crit range (default: nat 20). Multiply damage DICE by crit mod (default x2). Attribute bonus added once, not per die." },
    { name: "Critical Miss", desc: "Natural 1 always misses + consequence. Ranged: jam/misfire. Melee: drop weapon. Mancy/Magic: see crit fail tables." },
    { name: "Evasion (EVA)", desc: "10 + DEX Mod + bonuses. Lose DEX bonus when flanked (opposite sides) or unaware (surprise/stealth). Armor gives DR, not EVA." },
  ],
  "Action Economy": [
    { name: "Free Action", desc: "A fraction of a second. Shout, drop an item." },
    { name: "Bonus Action", desc: "~1 second. Say a sentence, toss something, toggle a flashlight." },
    { name: "Secondary Action", desc: "~2 seconds. Draw/ready a weapon, retrieve an item, move (also called 'move action'). Can split movement around an attack via Attack on the Move." },
    { name: "Standard Action", desc: "~3 seconds. Attack, stand up from prone, help with a skill check." },
    { name: "Reaction", desc: "In response to another's action. Once per round unless stated otherwise. ~1 second or less." },
  ],
  "General Maneuvers": [
    { name: "Run", desc: "Standard + Secondary Action. Move double your speed. Also applies to swimming and climbing." },
    { name: "Run for Cover", desc: "Reaction. Run to cover within 10 ft." },
    { name: "Going Prone", desc: "Bonus Action to go prone or stand up. Prone: +4 EVA vs ranged, -4 vs melee, DR 1 vs explosive AoE." },
    { name: "Crawl", desc: "While prone: Secondary Action to crawl ¼ speed. Standard + Secondary for ½ speed." },
    { name: "Attack on the Move", desc: "Attack at any point during your Secondary Action movement (e.g. move 10ft, attack, move 20ft)." },
    { name: "Take the Hit", desc: "Reaction. When an ally within 5 ft takes damage, swap places and take it instead." },
    { name: "Attack of Opportunity", desc: "Reaction. When a target moves through or out of your melee reach, make a single normal attack." },
    { name: "Stop-Drop-and-Roll", desc: "Standard + Secondary Action. Go prone and roll, removing up to 5 stacks of Burn." },
    { name: "Sunder", desc: "Standard Action. Attack vs EVA to damage armor, items, Soulmender parts, or vehicles. Each 3+ on a damage die removes 1 Structure Point. Stationary objects have EVA 5." },
  ],
  "Melee Maneuvers": [
    { name: "Disarm", desc: "Standard Action. Contested Acrobatics or Athletics vs target. Loser drops weapon. Target may make Attack of Opportunity regardless." },
    { name: "Grapple", desc: "Standard Action. Contested Athletics or Acrobatics vs target. Success: restrain target (your move reduced to 5ft). Maintaining costs Secondary Action each round. Target limited to Secondary Action to break free or mental Bonus/Secondary abilities." },
    { name: "→ Choke", desc: "Standard Action on grappled target. Apply Asphyxiation. Must use Standard Action each round to maintain." },
    { name: "→ Trip", desc: "Standard Action on grappled target. Contested Athletics/Acrobatics. Success: target knocked prone." },
    { name: "→ Crush", desc: "Standard Action on grappled target. Contested Athletics/Acrobatics. Deal STR modifier damage. Can cause Critical Condition but not outright kill." },
    { name: "Put Your Back Into It", desc: "Standard + Bonus Action. Single melee attack with +1 AP or removes 1 additional Structure Point." },
  ],
  "Ranged Maneuvers": [
    { name: "Aim", desc: "Secondary Action. Gain +2 on your next ranged attack roll." },
    { name: "Concentrated Fire", desc: "Standard + Secondary Action. Single ranged attack with +1 AP or removes 1 additional Structure Point." },
  ],
  "Automatic Weapon": [
    { name: "Suppressing Fire", desc: "Standard + Secondary Action. Suppress a 5ft zone per Rapid Fire level (adjacent zones). AoE: all creatures in zone make DC 12 WIS Save or lose all bonuses on attacks next round. Costs 3 Bursts. Requires Trained Gunner." },
    { name: "Selective Fire", desc: "Standard Action. Single attack with +1 to hit per Rapid Fire level. Costs 1 Burst. Requires Trained Gunner." },
  ],
  "Cover": [
    { name: "Minimal Cover", desc: "Fighting from cover (e.g. shooting out). +1 EVA, +1 DEX Saves vs AoE. Can still be targeted." },
    { name: "Half Cover", desc: "50% obscured. +2 EVA, +2 DEX Saves vs AoE. Can still be targeted." },
    { name: "High Cover", desc: "75% obscured. +3 EVA, +3 DEX Saves vs AoE. Can still be targeted." },
    { name: "Full Cover", desc: "100% obscured. +4 EVA, +4 DEX Saves vs AoE. Can still be targeted if enemy knows your position." },
  ],
  "Critical Hits": [
    { name: "Scoring a Crit", desc: "Roll within your weapon's critical range (default: natural 20). Multiply damage dice by crit modifier (default x2). Attribute bonus to damage added once, not per die." },
    { name: "Crit Alternative", desc: "Instead of multiplying damage, reduce target's DR by the crit modifier value for that attack." },
  ],
};


const MERIT_LIST = {
  "Enhancements of the Body": [
    [1,"Blessed"],[1,"Keen Senses"],[1,"Scentless"],[1,"Nimble"],[1,"Hardy"],[1,"Light Feet"],[1,"Daredevil"],
    [1,"Skill Aptitude"],[1,"Steel Lungs"],[1,"Iron Grip"],[1,"Well Grounded"],[1,"Truth Sense"],
    [1,"An Arm and A Leg"],[1,"Eye for an Eye"],[1,"No Place to Hide"],[1,"Thick Skull"],
    [1,"Bracing for Impact"],[1,"Drug Resistant"],[1,"Mr. Sandman"],
    [2,"Quick Hands"],[2,"Breaker"],[2,"Athletic"],[2,"Beautiful Voice"],[2,"Immune Overdrive"],
    [2,"Strong Back"],[2,"Ten Finger Discount"],[2,"Stubborn as a Bull"],
    [3,"Sharp-Eyed"],[3,"Poison Resistant"],
  ],
  "Superiorities of the Mind": [
    [1,"Lucid Dreamer"],[1,"Busy Body"],[1,"Helping Heart"],[1,"Habitual Mechanic"],[1,"Critical Savant"],
    [2,"Bloodlust"],[2,"Persuasive"],[2,"Linguist"],
    [3,"Eidetic Memory"],[3,"Night Owl"],[3,"Early Bird"],[3,"Cold-Killer"],[3,"Sociopath"],[3,"Madman"],
  ],
  "Fascinations": [
    [1,"Minor Fascination"],[2,"Major Fascination"],
  ],
  "Benedictions of the Self": [
    [1,"Sensitive"],[1,"Ghost Hunter"],[1,"Kind"],
    [2,"Deadpan"],[2,"Lucky"],[2,"Psychically Dull"],[2,"Calm"],[2,"Occultation"],[2,"Astroharmonics"],
    [3,"Third Eye Open"],[4,"Fateless"],
  ],
  "Allies & Mutations": [
    [1,"Lesser Allies"],[2,"Middling Allies"],[3,"Greater Allies"],[3,"Mutated"],
  ],
  "Human": [
    [1,"Adopted"],[1,"City Born"],[1,"Country Born"],[1,"Still Born"],[2,"Jack of All Trades"],[2,"Head-Start"],
  ],
  "War Born": [
    [1,"War Never Changes"],[2,"Hardened Warrior"],[2,"Rage of the War Born"],[2,"Bred to Lead"],
  ],
  "Grey Blood": [
    [1,"Passionate"],[1,"Dark Grey"],[1,"Light Grey"],[2,"Post Graduate"],[2,"A Kiss of Grey"],
  ],
  "Ellson House": [
    [1,"A Penny Saved"],[1,"Deny the Supernatural"],[2,"Guarded Mind"],[3,"Ineptitism"],
  ],
  "Gripe": [
    [1,"Zeal"],[2,"Lead Head"],[2,"Priest"],[3,"True Grievances"],
  ],
  "Exalted": [
    [1,"Executioner's Blade"],[2,"Leper"],[3,"Extreme Mutation"],
  ],
  "Fae Darkleecher": [
    [1,"As Luck Would Have It"],[2,"Guardian Angel"],[3,"Changeling"],
  ],
  "Spirit Darkleecher": [
    [1,"Natural Trait"],[2,"Creature of the Wild"],[3,"Beast Kin"],
  ],
  "Demonic Darkleecher": [
    [1,"Blood of a Demon"],[2,"Ichor Blood"],[3,"Beast Kin"],
  ],
  "Eldritch Darkleecher": [
    [1,"Amphibious"],[2,"Eldritch Resilience"],[3,"Psychic Aptitude"],
  ],
  "Half-Leecher": [
    [1,"Human Blood"],[1,"Darkleecher Blood"],[3,"Blessed by Both"],
  ],
};

const FLAW_LIST = {
  "Imperfections of the Body": [
    [1,"Astigmatism"],[1,"Completely Color Blind"],[1,"Light Sensitive"],[1,"Horrible Voice"],
    [1,"Hard of Hearing"],[1,"Tinnitus"],[1,"Anosmia"],[1,"Asthma"],[1,"Limp"],[1,"Bad Knees"],
    [2,"One Eyed"],[2,"Itchy Skin"],[2,"Out of Shape"],[2,"Hemophilia"],
    [2,"Spray and Pray, Swing and Miss"],[2,"Immunocompromised"],[2,"Weak Stomach"],[2,"Missing Limb"],
    [3,"Blind"],[3,"Deaf"],[3,"Sun Sickness"],[3,"Anomalous Refractor"],
    [5,"On Your Deathbed"],
  ],
  "Allergies": [
    [1,"Minor Allergies"],[1,"Death by the Common"],[3,"Major Allergies"],[5,"Deadly Allergies"],
  ],
  "Disorders of the Mind": [
    [1,"Cowardly"],[1,"Inept"],[1,"Careless"],[1,"Curiosity"],
    [2,"Amnesia"],[2,"Fried"],[2,"Results Focused"],[2,"Narcoleptic"],[2,"Bad Dreams"],[2,"PTSD"],
    [3,"Completely Inept"],[4,"Shellshock"],[5,"Insomnia"],
  ],
  "Seizures": [
    [1,"Seizures"],[2,"Prone to Seizures"],[3,"Prone to Grand Mal Seizures"],
  ],
};

const ABILITY_LIST = {
  "General": [
    "Weapon Proficiency","Weapon Focus","Weapon Specialization","Armor Proficiency","Rampant Modification",
    "Renown","Toughness","Die Hard","Improvisationalist","Magic Adept","Rituals with Friends",
  ],
  "Physical (STR/DEX)": [
    "Adrenaline Rush","Adrenaline Burst",
  ],
  "Mental (INT/WIS)": [
    "Rally","Insightful Insult",
  ],
  "Strength": [
    "Strongman","Relentless and Reckless","Brawler","Improved Brawler","Grappler","Improved Grappler",
    "Pitcher","Sunderer","Launcher Specialist","Shotgunner","Charge and Cleave",
  ],
  "Dexterity": [
    "Duelist","Riposte","Sniper","Bow and Blow","Thief","Crippling Exit","Assassin","Fatal Blow",
    "Trained Gunner","Get-Away-Driver",
  ],
  "Constitution": [
    "Bulwark","Block","Dodge","Well Composed","Taunt","Gunslinger","Improved Gunslinger",
    "Fiendish","Laughing Masochist","Feel No Pain",
  ],
  "Intelligence": [
    "Intelligent Design","Rhetoric","Medical Expertise","Archinaut","Improved Archinaut",
    "Anomalous Sense","Anomalous Manipulation","Well Read","Know-It-All","I Read the Schematic",
    "Mind Over Matter","Tinkerer","Pep Talk",
  ],
  "Wisdom": [
    "Insightful Argument","Tracker","Networked","Return to Sender","I Counted Your Bullets",
    "Step Up","Know Your Enemy","Cunning Initiative","Medic","Improved Medic",
  ],
  "Charisma": [
    "Connections","Charismatic Casting","Disarming Smile","Rocker-N-Roller","Marked","Improved Marked",
    "Animal Lover","Improved Animal Lover","Dress for the Job You Want","Shake It Off","Critical Killer",
  ],
};

const getModifier = (score) => {
  if (score >= 24) return 7; if (score >= 22) return 6; if (score >= 20) return 5;
  if (score >= 18) return 4; if (score >= 16) return 3; if (score >= 14) return 2;
  if (score >= 12) return 1; if (score >= 10) return 0; if (score >= 8) return -1;
  if (score >= 6) return -2; if (score >= 4) return -3; if (score >= 2) return -4; return -5;
};
const fmtMod = (m) => (m >= 0 ? `+${m}` : `${m}`);

const defaultChar = (id, name, race, pedigree) => ({
  id, name, race, pedigree, faction: "",
  level: 1, background: "", languages: [],
  cp_spent: 0,
  primary_attr: "STR", secondary_attr: "DEX",
  attrs: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
  attr_caps: { STR: 18, DEX: 18, CON: 18, INT: 18, WIS: 18, CHA: 18 },
  hp_max: 10, hp_current: 10, hp_temp: 0, recovery_die: "1d6",
  evasion_bonus: 0, movement: 30, damage_mod: 0, init_bonus: 0,
  fatigue: 0, status_effects: "",
  damage_resistance: "",
  mana_current: 0, mana_enabled: false,
  pe_current: 0, pe_enabled: false, mancer_level: 0,
  sanity_current: 50,
  sanity_dcs: { Violence: 7, Morality: 10, Supernatural: 13 },
  trained_skills: {},
  trained_skill_list: [],
  trained_skill_cap: 9,
  knowledge_types: [], craft_types: [],
  sp_spent: 0,
  weapons: [],
  armor: [],
  merits: [], flaws: [], ability_list: [], abilities: "", equipment: "", notes: "",
  photo_url: "",
  mancer_branded: false, mancer_type: "",
  parent_lineage: "",
  spellbook: [],
  section_order: [...DEFAULT_SECTION_ORDER],
  journal: []
});

const DEFAULT_CHARS = [
  defaultChar("char1", "Agent Dossier #1", "Human", "Human"),
  defaultChar("char2", "Agent Dossier #2", "Darkleecher", "Fae"),
  defaultChar("char3", "Agent Dossier #3", "Human", "Exalted"),
];

const STORAGE_KEY = "rookwren-locke-dossiers-v2";

const THEMES = {
  noir: {
    name: "Noir Dossier",
    bg: "#1a1410", bgAlt: "#2a2118", bgCard: "#2f2820", bgInput: "#1a141088",
    accent: "#c4a46c", accentDim: "#8b7355", accentDark: "#4a3c2a",
    text: "#d4c5a9", textDim: "#8b7355", textDark: "#3a3025",
    stamp: "#8b2500", border: "#4a3c2a", borderLight: "#4a3c2a33",
    headerBg: "linear-gradient(180deg, #2a2118 0%, #1f1a14 100%)",
    tabBg: "linear-gradient(180deg, #c8b892 0%, #b8a882 40%, #a89872 100%)",
    tabActive: "linear-gradient(180deg, #3a2e1e 0%, #2e2418 100%)",
    tabText: "#3a3025", tabBorder: "#8b7355",
    pageBg: "#f4efe6", pageText: "#2a2118", pageBorder: "#c8bfb0",
    pageAccent: "#4a3c2a", pageDim: "#8b7355",
    tooltipBg: "#f5f0e0", tooltipBorder: "#c8bfb0",
    barFill: "#8b2500", barBg: "#4a3c2a33",
  },
  book: {
    name: "Acheron",
    bg: "#2a3640", bgAlt: "#344450", bgCard: "#3a4c58", bgInput: "#2a364088",
    accent: "#b8654a", accentDim: "#8a7b6e", accentDark: "#5a4a40",
    text: "#ddd4c4", textDim: "#8a7b6e", textDark: "#5a4a40",
    stamp: "#b8654a", border: "#5a4a40", borderLight: "#5a4a4044",
    headerBg: "linear-gradient(180deg, #344450 0%, #2a3640 100%)",
    tabBg: "linear-gradient(180deg, #3e5060 0%, #344450 100%)",
    tabActive: "linear-gradient(180deg, #4a3530 0%, #3e2a24 100%)",
    tabText: "#ddd4c4", tabBorder: "#5a4a40",
    pageBg: "#f0e8d8", pageText: "#2a2a22", pageBorder: "#c8b8a0",
    pageAccent: "#5a4a40", pageDim: "#8a7b6e",
    tooltipBg: "#f0e8d8", tooltipBorder: "#c8b8a0",
    barFill: "#b8654a", barBg: "#5a4a4044",
  },
  dws: {
    name: "Dark World Studios",
    bg: "#0a0a0e", bgAlt: "#141418", bgCard: "#1a1a20", bgInput: "#0a0a0e88",
    accent: "#cc2222", accentDim: "#666674", accentDark: "#2a0a0a",
    text: "#e8e8ec", textDim: "#666674", textDark: "#2a2a30",
    stamp: "#cc2222", border: "#2a2a30", borderLight: "#2a2a3044",
    headerBg: "linear-gradient(180deg, #141418 0%, #0a0a0e 100%)",
    tabBg: "linear-gradient(180deg, #1e1e24 0%, #16161c 100%)",
    tabActive: "linear-gradient(180deg, #2a1818 0%, #201414 100%)",
    tabText: "#e8e8ec", tabBorder: "#3a2020",
    pageBg: "#f0ece4", pageText: "#1a1a1e", pageBorder: "#c0bab0",
    pageAccent: "#2a0a0a", pageDim: "#666674",
    tooltipBg: "#f0ece4", tooltipBorder: "#c0bab0",
    barFill: "#cc2222", barBg: "#2a2a3044",
  },
};

export default function TrinityDossiers() {
  const [characters, setCharacters] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    identity: true, attributes: true, combat: true, sanity: true,
    skills: false, merits: false, abilities: false, notes: false
  });
  const [journalOpen, setJournalOpen] = useState(false);
  const [journalEdit, setJournalEdit] = useState(null);
  const [journalDraft, setJournalDraft] = useState({ title: "", session: "", content: "" });
  const [dragSection, setDragSection] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [spellbookOpen, setSpellbookOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [printMode, setPrintMode] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDeleteEntry, setConfirmDeleteEntry] = useState(null);
  const [combatRefOpen, setCombatRefOpen] = useState(false);
  const [equipmentOpen, setEquipmentOpen] = useState(false);
  const [theme, setTheme] = useState("noir");
  const [firmName, setFirmName] = useState("ROOKWREN & LOCKE");
  const [firmSub, setFirmSub] = useState("CONTRACTUAL OBLIGATIONS DIVISION");
  const saveTimeout = useRef(null);
  const isMobile = useIsMobile();

  // Responsive style helper - merges base style with mobile overrides
  const rs = useCallback((key) => {
    const base = styles[key] || {};
    const mobile = isMobile && mobileStyles[key] ? mobileStyles[key] : {};
    return { ...base, ...mobile };
  }, [isMobile]);

  // Load theme + firm name
  useEffect(() => {
    try { const r = localStorage.getItem("rookwren-theme"); if (r) setTheme(r); } catch {}
    try { const r = localStorage.getItem("rookwren-firm"); if (r) { const p = JSON.parse(r); setFirmName(p.name || "ROOKWREN & LOCKE"); setFirmSub(p.sub || "CONTRACTUAL OBLIGATIONS DIVISION"); } } catch {}
  }, []);
  const changeTheme = (t) => { setTheme(t); try { localStorage.setItem("rookwren-theme", t); } catch {} };
  const updateFirm = (name, sub) => { setFirmName(name); setFirmSub(sub); try { localStorage.setItem("rookwren-firm", JSON.stringify({ name, sub })); } catch {} };

  const T = THEMES[theme] || THEMES.noir;
  styles = getStyles(T);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged = parsed.map((saved, i) => {
            const def = defaultChar(saved.id || `char${i+1}`, saved.name || `Agent ${i+1}`, saved.race || "Human", saved.pedigree || "");
            return { ...def, ...saved };
          });
          setCharacters(merged);
        } else { setCharacters(DEFAULT_CHARS); }
      } else { setCharacters(DEFAULT_CHARS); }
    } catch { setCharacters(DEFAULT_CHARS); }
    setLoading(false);
  }, []);

  const saveData = useCallback((data) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      setSaving(true);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
      catch (e) { console.error("Save failed:", e); }
      setSaving(false);
    }, 800);
  }, []);

  const updateChar = useCallback((field, value) => {
    setCharacters(prev => {
      const next = prev.map((c, i) => {
        if (i !== activeTab) return c;
        if (field.includes(".")) {
          const [parent, child] = field.split(".");
          return { ...c, [parent]: { ...c[parent], [child]: value } };
        }
        return { ...c, [field]: value };
      });
      saveData(next);
      return next;
    });
  }, [activeTab, saveData]);

  const toggleSection = (key) => setExpandedSections(p => ({ ...p, [key]: !p[key] }));

  const resetAll = () => {
    if (!confirmReset) { setConfirmReset(true); return; }
    setCharacters(DEFAULT_CHARS);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CHARS)); } catch {}
    setConfirmReset(false);
  };

  const addJournalEntry = () => {
    if (!journalDraft.title.trim() && !journalDraft.content.trim()) return;
    const entry = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      timestamp: Date.now(),
      session: journalDraft.session || "—",
      title: journalDraft.title || "Untitled Entry",
      content: journalDraft.content,
    };
    const updated = [...(char.journal || []), entry];
    updateChar("journal", updated);
    setJournalDraft({ title: "", session: "", content: "" });
  };

  const updateJournalEntry = (entryId) => {
    const updated = (char.journal || []).map(e =>
      e.id === entryId ? { ...e, title: journalDraft.title, session: journalDraft.session, content: journalDraft.content } : e
    );
    updateChar("journal", updated);
    setJournalEdit(null);
    setJournalDraft({ title: "", session: "", content: "" });
  };

  const deleteJournalEntry = (entryId) => {
    if (confirmDeleteEntry !== entryId) { setConfirmDeleteEntry(entryId); return; }
    updateChar("journal", (char.journal || []).filter(e => e.id !== entryId));
    setConfirmDeleteEntry(null);
  };

  const startEditEntry = (entry) => {
    setJournalEdit(entry.id);
    setJournalDraft({ title: entry.title, session: entry.session, content: entry.content });
  };

  const cancelEditEntry = () => {
    setJournalEdit(null);
    setJournalDraft({ title: "", session: "", content: "" });
  };

  const exportJournalPDF = () => {
    const entries = char.journal || [];
    if (!entries.length) return;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${char.name} — Field Journal</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Special+Elite&family=Courier+Prime:wght@400;700&family=Playfair+Display:wght@700;900&display=swap');
body{font-family:'Courier Prime',monospace;background:#f4efe6;color:#2a2118;max-width:750px;margin:0 auto;padding:40px 50px;}
.header{text-align:center;border-bottom:3px double #8b7355;padding-bottom:24px;margin-bottom:32px;}
.logo{font-family:'Playfair Display',serif;font-size:28px;font-weight:900;color:#4a3c2a;letter-spacing:4px;}
.logo-sub{font-family:'Special Elite',cursive;font-size:10px;letter-spacing:5px;color:#8b7355;margin-top:4px;}
.agent{font-family:'Special Elite',cursive;font-size:16px;margin-top:16px;color:#4a3c2a;letter-spacing:2px;}
.stamp{font-family:'Special Elite',cursive;color:#8b2500;border:3px solid #8b2500;display:inline-block;padding:2px 16px;transform:rotate(-3deg);font-size:14px;letter-spacing:3px;opacity:0.6;margin-top:12px;}
.entry{page-break-inside:avoid;margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid #d4c5a9;}
.entry-header{display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;margin-bottom:6px;}
.entry-title{font-family:'Playfair Display',serif;font-size:18px;font-weight:700;color:#2a2118;}
.entry-meta{font-family:'Special Elite',cursive;font-size:11px;color:#8b7355;letter-spacing:1px;}
.entry-content{font-size:13px;line-height:1.8;white-space:pre-wrap;margin-top:8px;color:#3a3025;}
.footer{text-align:center;font-family:'Special Elite',cursive;font-size:8px;letter-spacing:4px;color:#8b7355;margin-top:40px;border-top:1px solid #d4c5a9;padding-top:16px;}
@media print{body{background:white;padding:20px 40px;}@page{margin:0.75in;}}
</style></head><body>
<div class="header">
<div class="logo">${firmName}</div>
<div class="logo-sub">${firmSub}</div>
<div class="agent">${char.name}</div>
<div class="entry-meta">${char.race}${char.pedigree ? ' — ' + char.pedigree : ''} | Level ${char.level}</div>
<div class="stamp">FIELD JOURNAL</div>
</div>
${entries.sort((a,b) => (a.timestamp||0) - (b.timestamp||0)).map(e => `
<div class="entry">
<div class="entry-header">
<span class="entry-title">${e.title}</span>
<span class="entry-meta">${e.date}${e.session && e.session !== '—' ? ' — Session ' + e.session : ''}</span>
</div>
<div class="entry-content">${e.content.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
</div>`).join('')}
<div class="footer">${firmName} — CLASSIFIED</div>
</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${char.name.replace(/[^a-zA-Z0-9]/g, "_")}_journal.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJournalText = () => {
    const entries = char.journal || [];
    if (!entries.length) return;
    const divider = "═".repeat(60);
    const lines = [
      divider,
      `  ${firmName} — ${firmSub}`,
      `  FIELD JOURNAL: ${char.name}`,
      `  ${char.race}${char.pedigree ? ' — ' + char.pedigree : ''} | Level ${char.level}`,
      divider, ""
    ];
    entries.sort((a,b) => (a.timestamp||0) - (b.timestamp||0)).forEach(e => {
      lines.push(`── ${e.title} ──`);
      lines.push(`Date: ${e.date}${e.session && e.session !== '—' ? '  |  Session: ' + e.session : ''}`);
      lines.push("");
      lines.push(e.content);
      lines.push(""); lines.push("─".repeat(40)); lines.push("");
    });
    lines.push(divider);
    lines.push(`  ${firmName} — CLASSIFIED`);
    lines.push(divider);
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${char.name.replace(/[^a-zA-Z0-9]/g, "_")}_journal.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const removeAgent = (idx) => {
    if (characters.length <= 1) return;
    if (confirmRemove !== idx) { setConfirmRemove(idx); return; }
    const newTab = activeTab === idx ? Math.max(0, idx - 1) : activeTab > idx ? activeTab - 1 : activeTab;
    setActiveTab(newTab);
    setCharacters(prev => {
      const next = prev.filter((_, i) => i !== idx);
      saveData(next);
      return next;
    });
    setConfirmRemove(null);
  };

  const addAgent = () => {
    const newId = `char${Date.now()}`;
    const newChar = defaultChar(newId, `New Agent`, "Human", "Human");
    setCharacters(prev => {
      const next = [...prev, newChar];
      saveData(next);
      return next;
    });
    setActiveTab(characters.length);
  };

  if (loading || !characters) return (
    <div style={styles.loadingScreen}>
      <div style={{ animation: "flicker 3s infinite", textAlign: "center" }}>
        <svg width="60" height="60" viewBox="0 0 100 100" style={{ marginBottom: 20, opacity: 0.6 }}>
          <rect x="5" y="5" width="90" height="90" rx="4" fill="none" stroke={T.accent} strokeWidth="2"/>
          <path d="M50 15 C35 15 25 25 25 38 C25 52 40 48 40 58 L40 72 L35 72 L35 78 L65 78 L65 72 L60 72 L60 58 C60 48 75 52 75 38 C75 25 65 15 50 15Z" fill={T.accent} opacity="0.7"/>
          <circle cx="45" cy="33" r="3" fill={T.bg}/>
          <path d="M42 42 Q50 48 58 42" fill="none" stroke={T.bg} strokeWidth="2"/>
          <line x1="30" y1="85" x2="70" y2="85" stroke={T.accent} strokeWidth="2"/>
        </svg>
        <div style={styles.loadingLogo}>{firmName}</div>
        <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 9, letterSpacing: 5, color: T.accentDim, marginBottom: 24 }}>{firmSub}</div>
        <div style={styles.loadingText}>RETRIEVING PERSONNEL FILES...</div>
        <div style={{ width: 200, height: 2, background: T.borderLight, margin: "16px auto 0", borderRadius: 1, overflow: "hidden" }}>
          <div style={{ width: "60%", height: "100%", background: `${T.accent}44`, animation: "typeIn 2s ease-in-out infinite" }}/>
        </div>
      </div>
    </div>
  );

  const char = characters[activeTab];
  const eva = 10 + getModifier(char.attrs.DEX) + (char.evasion_bonus || 0);
  const initiative = getModifier(char.attrs.DEX);
  const sanMax = char.attrs.WIS * 5;
  const manaMax = char.mana_enabled ? char.attrs.INT + getModifier(char.attrs[char.primary_attr]) + getModifier(char.attrs[char.secondary_attr]) : 0;
  const peMax = char.pe_enabled ? char.attrs.CON + getModifier(char.attrs[char.primary_attr]) + (char.mancer_level || 0) : 0;
  const spPerLevel = SP_PER_LEVEL[char.primary_attr] + SP_PER_LEVEL[char.secondary_attr];
  const spTotal = spPerLevel * char.level;
  const trainedList = char.trained_skill_list || [];
  const knowledgeTypes = char.knowledge_types || [];
  const craftTypes = char.craft_types || [];
  const subtypeSpent = [...knowledgeTypes.map(kt => `Knowledge_-_${kt.replace(/\s/g, "_")}`), ...craftTypes.map(ct => `Craft_-_${ct.replace(/\s/g, "_")}`)].reduce((sum, key) => {
    const ranks = (char.trained_skills || {})[key] || 0;
    if (ranks === 0) return sum;
    return sum + (trainedList.includes(key) ? ranks : ranks * 2);
  }, 0);
  const spSpent = ALL_SKILLS.reduce((sum, s) => {
    if (s.name === "Knowledge" || s.name === "Craft") return sum;
    const ranks = (char.trained_skills || {})[s.key] || 0;
    if (ranks === 0) return sum;
    return sum + (trainedList.includes(s.key) ? ranks : ranks * 2);
  }, 0) + subtypeSpent + (char.sp_spent || 0);

  const meritsCpSpent = (char.merits || []).reduce((sum, m) => sum + (m.cost || 0), 0);
  const flawsCpGained = (char.flaws || []).reduce((sum, f) => sum + (f.cost || 0), 0);

  const caseNo = `R&L-${char.id.replace(/\D/g,"").padStart(3,"0")}-${String(char.level).padStart(2,"0")}-TRI`;

  const toggleTrainedSkill = (skillKey) => {
    const list = [...(char.trained_skill_list || [])];
    const cap = char.trained_skill_cap || 9;
    const idx = list.indexOf(skillKey);
    if (idx >= 0) { list.splice(idx, 1); }
    else if (list.length < cap) { list.push(skillKey); }
    updateChar("trained_skill_list", list);
  };

  const adjustSkillRank = (skillKey, attr, delta) => {
    const current = (char.trained_skills || {})[skillKey] || 0;
    const cap = char.attrs[attr];
    const next = Math.max(0, Math.min(cap, current + delta));
    updateChar(`trained_skills.${skillKey}`, next);
  };

  const addKnowledgeType = (typeName) => {
    const trimmed = typeName.trim();
    if (!trimmed) return;
    const existing = char.knowledge_types || [];
    if (existing.some(k => k.toLowerCase() === trimmed.toLowerCase())) return;
    updateChar("knowledge_types", [...existing, trimmed]);
  };

  const removeKnowledgeType = (typeName) => {
    const key = `Knowledge_-_${typeName.replace(/\s/g, "_")}`;
    setCharacters(prev => {
      const next = prev.map((c, i) => {
        if (i !== activeTab) return c;
        const updatedTypes = (c.knowledge_types || []).filter(k => k !== typeName);
        const updatedSkills = { ...(c.trained_skills || {}) };
        delete updatedSkills[key];
        const updatedTrained = (c.trained_skill_list || []).filter(k2 => k2 !== key);
        return { ...c, knowledge_types: updatedTypes, trained_skills: updatedSkills, trained_skill_list: updatedTrained };
      });
      saveData(next);
      return next;
    });
  };

  const addCraftType = (typeName) => {
    const trimmed = typeName.trim();
    if (!trimmed) return;
    const existing = char.craft_types || [];
    if (existing.some(k => k.toLowerCase() === trimmed.toLowerCase())) return;
    updateChar("craft_types", [...existing, trimmed]);
  };

  const removeCraftType = (typeName) => {
    const key = `Craft_-_${typeName.replace(/\s/g, "_")}`;
    setCharacters(prev => {
      const next = prev.map((c, i) => {
        if (i !== activeTab) return c;
        const updatedTypes = (c.craft_types || []).filter(k => k !== typeName);
        const updatedSkills = { ...(c.trained_skills || {}) };
        delete updatedSkills[key];
        const updatedTrained = (c.trained_skill_list || []).filter(k2 => k2 !== key);
        return { ...c, craft_types: updatedTypes, trained_skills: updatedSkills, trained_skill_list: updatedTrained };
      });
      saveData(next);
      return next;
    });
  };

  const sectionOrder = (char.section_order || DEFAULT_SECTION_ORDER).filter(s => SECTION_TITLES[s]);

  const handleDragStart = (sectionId) => { setDragSection(sectionId); };
  const handleDragOver = (e, sectionId) => { e.preventDefault(); setDragOver(sectionId); };
  const handleDragLeave = () => { setDragOver(null); };
  const handleDrop = (targetId) => {
    if (!dragSection || dragSection === targetId) { setDragSection(null); setDragOver(null); return; }
    const order = [...sectionOrder];
    const fromIdx = order.indexOf(dragSection);
    const toIdx = order.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) { setDragSection(null); setDragOver(null); return; }
    order.splice(fromIdx, 1);
    order.splice(toIdx, 0, dragSection);
    updateChar("section_order", order);
    setDragSection(null);
    setDragOver(null);
  };
  const handleDragEnd = () => { setDragSection(null); setDragOver(null); };

  const addMerit = (name, cost) => {
    const m = { id: Date.now().toString(), name: name || "", cost: cost || 1, desc: "" };
    updateChar("merits", [...(char.merits || []), m]);
  };
  const updateMerit = (id, field, value) => {
    updateChar("merits", (char.merits || []).map(m => m.id === id ? { ...m, [field]: value } : m));
  };
  const removeMerit = (id) => {
    updateChar("merits", (char.merits || []).filter(m => m.id !== id));
  };
  const addFlaw = (name, cost) => {
    const f = { id: Date.now().toString(), name: name || "", cost: cost || 1, desc: "" };
    updateChar("flaws", [...(char.flaws || []), f]);
  };
  const updateFlaw = (id, field, value) => {
    updateChar("flaws", (char.flaws || []).map(f => f.id === id ? { ...f, [field]: value } : f));
  };
  const removeFlaw = (id) => {
    updateChar("flaws", (char.flaws || []).filter(f => f.id !== id));
  };

  const addSpell = (kind) => {
    const entry = kind === "spell"
      ? { id: Date.now().toString(), kind: "spell", name: "", domain: "Arcane", tier: 1, cost: "", save: "DC 13", range: "", duration: "", casting_time: "", keywords: "", risk: "", desc: "" }
      : { id: Date.now().toString(), kind: "mancy", name: "", mancy_type: "Pyromancy", level: 1, pe_cost: "", desc: "" };
    updateChar("spellbook", [...(char.spellbook || []), entry]);
  };
  const updateSpell = (id, field, value) => {
    updateChar("spellbook", (char.spellbook || []).map(s => s.id === id ? { ...s, [field]: value } : s));
  };
  const removeSpell = (id) => {
    updateChar("spellbook", (char.spellbook || []).filter(s => s.id !== id));
  };

  const addAbility = (name) => {
    const a = { id: Date.now().toString(), name: name || "", cost: "", desc: "" };
    updateChar("ability_list", [...(char.ability_list || []), a]);
  };
  const updateAbility = (id, field, value) => {
    updateChar("ability_list", (char.ability_list || []).map(a => a.id === id ? { ...a, [field]: value } : a));
  };
  const removeAbility = (id) => {
    updateChar("ability_list", (char.ability_list || []).filter(a => a.id !== id));
  };

  const addWeapon = () => {
    const w = { id: Date.now().toString(), name: "", atk_bonus: "", damage: "", crit: "x2", type: "", range: "", ammo: "", capacity: "", properties: [], weight: "", price: "" };
    updateChar("weapons", [...(char.weapons || []), w]);
  };
  const updateWeapon = (id, field, value) => {
    updateChar("weapons", (char.weapons || []).map(w => w.id === id ? { ...w, [field]: value } : w));
  };
  const toggleWeaponProp = (id, propName) => {
    updateChar("weapons", (char.weapons || []).map(w => {
      if (w.id !== id) return w;
      const props = Array.isArray(w.properties) ? [...w.properties] : [];
      const idx = props.indexOf(propName);
      if (idx >= 0) props.splice(idx, 1); else props.push(propName);
      return { ...w, properties: props };
    }));
  };
  const removeWeapon = (id) => {
    updateChar("weapons", (char.weapons || []).filter(w => w.id !== id));
  };
  const addArmor = () => {
    const a = { id: Date.now().toString(), name: "", type: "L", resistance: "", properties: [], penalty: "", mod1: "", mod2: "", price: "" };
    updateChar("armor", [...(char.armor || []), a]);
  };
  const updateArmor = (id, field, value) => {
    updateChar("armor", (char.armor || []).map(a => a.id === id ? { ...a, [field]: value } : a));
  };
  const toggleArmorProp = (id, propName) => {
    updateChar("armor", (char.armor || []).map(a => {
      if (a.id !== id) return a;
      const props = Array.isArray(a.properties) ? [...a.properties] : [];
      const idx = props.indexOf(propName);
      if (idx >= 0) props.splice(idx, 1); else props.push(propName);
      return { ...a, properties: props };
    }));
  };
  const removeArmor = (id) => {
    updateChar("armor", (char.armor || []).filter(a => a.id !== id));
  };

  const TEXT_SECTIONS = {
    notes: [{ key: "notes", label: "Notes, Oddities, Fractures, Virtues" }],
  };

  return (
    <div style={styles.container}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Special+Elite&family=Courier+Prime:wght@400;700&family=Playfair+Display:wght@700;900&display=swap');
        * { box-sizing: border-box; scrollbar-width: thin; scrollbar-color: ${T.accentDim} ${T.bgAlt}; }
        *::-webkit-scrollbar { width: 6px; }
        *::-webkit-scrollbar-track { background: ${T.bgAlt}; }
        *::-webkit-scrollbar-thumb { background: ${T.accentDim}; border-radius: 3px; }
        @keyframes stampIn { 0% { transform: scale(3) rotate(-15deg); opacity: 0; } 60% { transform: scale(0.95) rotate(-4deg); opacity: 0.8; } 100% { transform: scale(1) rotate(-5deg); opacity: 0.7; } }
        @keyframes fadeIn { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes typeIn { 0% { width: 0; } 100% { width: 100%; } }
        @keyframes flicker { 0%,97%,100% { opacity: 1; } 98% { opacity: 0.7; } 99% { opacity: 0.9; } }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="number"] { -moz-appearance: textfield; }
        input:focus, textarea:focus, select:focus { border-color: ${T.accent} !important; box-shadow: 0 0 6px ${T.accent}22; }
        textarea:focus { box-shadow: 0 0 12px ${T.accent}11, inset 0 0 30px rgba(0,0,0,0.1); }
        button:hover { filter: brightness(1.15); }
        .dossier-noise { position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 0; opacity: 0.03; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
        .coffee-ring { position: absolute; border-radius: 50%; border: 2px solid ${T.accentDim}08; width: 80px; height: 80px; pointer-events: none; z-index: 0; }
        .ink-splat { position: absolute; width: 12px; height: 12px; background: ${T.accentDark}08; border-radius: 50%; pointer-events: none; z-index: 0; }
        @keyframes rain { 0% { transform: translateY(-100%); } 100% { transform: translateY(100vh); } }
        .rain-container { position: fixed; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 0; overflow: hidden; opacity: 0.04; }
        .rain-drop { position: absolute; width: 1px; background: linear-gradient(180deg, transparent, #8b9bb4, transparent); animation: rain linear infinite; }
        .venetian-blinds { position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 1; opacity: 0.08; background: repeating-linear-gradient(180deg, transparent 0px, transparent 8px, rgba(0,0,0,0.7) 8px, rgba(0,0,0,0.7) 10px, transparent 10px, transparent 22px); transform: skewY(-2deg) scaleY(1.1); }
        .redacted-stamp { position: absolute; pointer-events: none; z-index: 0; font-family: 'Special Elite', cursive; color: ${T.stamp}; opacity: 0.04; letter-spacing: 6px; font-size: 14px; transform: rotate(-8deg); white-space: nowrap; }
      `}</style>

      {/* HEADER */}
      <div className="rain-container">
        {[...Array(30)].map((_, i) => (
          <div key={i} className="rain-drop" style={{ left: `${(i * 3.3) + Math.random() * 2}%`, height: `${60 + Math.random() * 80}px`, animationDuration: `${1.5 + Math.random() * 2}s`, animationDelay: `${Math.random() * 3}s` }}/>
        ))}
      </div>

      {/* HEADER */}
      <div style={styles.header}>
        <div className="venetian-blinds"/>
        <div style={rs("headerInner")}>
          <div style={styles.logoBlock}>
            <svg width={isMobile ? 32 : 44} height={isMobile ? 32 : 44} viewBox="0 0 100 100" style={{ marginRight: isMobile ? 8 : 14, flexShrink: 0 }}>
              <rect x="5" y="5" width="90" height="90" rx="4" fill="none" stroke={T.accent} strokeWidth="3"/>
              <path d="M50 15 C35 15 25 25 25 38 C25 52 40 48 40 58 L40 72 L35 72 L35 78 L65 78 L65 72 L60 72 L60 58 C60 48 75 52 75 38 C75 25 65 15 50 15Z" fill={T.accent} opacity="0.9"/>
              <circle cx="45" cy="33" r="3" fill={T.bg}/>
              <path d="M42 42 Q50 48 58 42" fill="none" stroke={T.bg} strokeWidth="2"/>
              <line x1="30" y1="85" x2="70" y2="85" stroke={T.accent} strokeWidth="2"/>
            </svg>
            <div>
              <input type="text" value={firmName} onChange={(e) => updateFirm(e.target.value, firmSub)}
                style={{ ...rs("logoText"), background: "transparent", border: "none", outline: "none", width: "100%", cursor: "text" }}/>
              <input type="text" value={firmSub} onChange={(e) => updateFirm(firmName, e.target.value)}
                style={{ ...rs("logoSub"), background: "transparent", border: "none", outline: "none", width: "100%", cursor: "text" }}/>
            </div>
          </div>
          <div style={styles.headerRight}>
            <div style={rs("classifiedStamp")}>CLASSIFIED</div>
            <div style={styles.saveIndicator}>
              {saving ? <span style={{ animation: "pulse 1s infinite" }}>◉ SAVING</span> : <span style={{ opacity: 0.4 }}>◉ SYNCED</span>}
            </div>
            {!isMobile && <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
              {Object.entries(THEMES).map(([key, t]) => (
                <button key={key} onClick={() => changeTheme(key)} style={{ ...styles.themeBtn, ...(theme === key ? styles.themeBtnActive : {}) }} title={t.name}>
                  <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: t.accent, marginRight: 4 }}/>
                  {t.name.split(" ")[0]}
                </button>
              ))}
            </div>}
          </div>
        </div>
        <div style={rs("headerBar")}>
          <span style={rs("headerBarText")}>{isMobile ? "TRINITY — PERSONNEL DOSSIERS" : "TRINITY INVESTIGATIONS — PERSONNEL DOSSIERS — INTERNAL USE ONLY"}</span>
        </div>
      </div>

      {/* TABS */}
      <div style={rs("tabRow")}>
        {characters.map((c, i) => (
          <div key={i} style={{ position: "relative", flex: isMobile ? "0 0 auto" : 1 }}>
            <div onClick={() => setActiveTab(i)}
              style={{ ...rs("tab"), ...(i === activeTab ? styles.tabActive : {}), cursor: "pointer" }}>
              <span style={rs("tabLabel")}>DOSSIER {String(i + 1).padStart(2, "0")}</span>
              <span style={rs("tabName")}>{c.name}</span>
              <span style={rs("tabRace")}>{c.race}{c.pedigree ? ` — ${c.pedigree}` : ""}</span>
            </div>
            {characters.length > 1 && (
              <div onClick={(e) => { e.stopPropagation(); removeAgent(i); }}
                style={{ ...styles.tabClose, ...(confirmRemove === i ? styles.tabCloseConfirm : {}) }}
                title={confirmRemove === i ? "Click again to confirm" : "Remove agent"}
                onMouseLeave={() => { if (confirmRemove === i) setConfirmRemove(null); }}>
                {confirmRemove === i ? "✓" : "✕"}
              </div>
            )}
          </div>
        ))}
        <div onClick={addAgent} style={rs("addTab")} title="Add new agent">+</div>
        <button onClick={() => setJournalOpen(true)} style={rs("journalStamp")}>
          <span style={rs("journalStampInner")}>{isMobile ? "JOURNAL" : "FIELD JOURNAL"}</span>
          <span style={rs("journalStampCount")}>{(char.journal || []).length}</span>
        </button>
      </div>

      {/* DOSSIER CONTENT */}
      <div style={rs("dossierWrap")}>
        <div style={rs("dossierPage")}>
          {/* Decorative elements - hidden on mobile */}
          {!isMobile && <>
            <div className="dossier-noise"/>
            <div className="coffee-ring" style={{ bottom: 120, left: 40 }}/>
            <div className="coffee-ring" style={{ top: 200, right: 60, width: 60, height: 60 }}/>
            <div className="ink-splat" style={{ top: 150, left: 200 }}/>
            <div className="ink-splat" style={{ bottom: 300, right: 150, width: 8, height: 8 }}/>
            <div className="ink-splat" style={{ top: 400, left: 100, width: 6, height: 6 }}/>
            <div className="redacted-stamp" style={{ top: 180, right: 40 }}>[REDACTED]</div>
            <div className="redacted-stamp" style={{ top: 450, left: 60, transform: "rotate(-12deg)", fontSize: 11 }}>[CLASSIFIED — LEVEL 4]</div>
            <div className="redacted-stamp" style={{ bottom: 200, right: 100, transform: "rotate(-5deg)", fontSize: 10 }}>[REDACTED]</div>
            <div className="redacted-stamp" style={{ top: 700, left: 180, transform: "rotate(-15deg)", fontSize: 9 }}>EYES ONLY</div>
            <div style={styles.caseNumber}>CASE NO. R&L-{char.id.replace(/\D/g,"").padStart(3,"0")}-{String(char.level).padStart(2,"0")}-TRI</div>
            <div style={styles.cornerTL}/>
            <div style={styles.cornerBR}/>
            <div style={styles.soulBoundStamp}>SOUL BOUND</div>
            {char.mancer_branded && <div style={styles.mancerStamp}>⚠ MANCER — REGISTERED ⚠</div>}
          </>}

          {/* SECTIONS - draggable and reorderable */}
          {sectionOrder.map(secId => (
            <div key={secId}
              draggable
              onDragStart={() => handleDragStart(secId)}
              onDragOver={(e) => handleDragOver(e, secId)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(secId)}
              onDragEnd={handleDragEnd}
              style={{ ...styles.draggableSection, ...(dragOver === secId ? styles.dragOverSection : {}), ...(dragSection === secId ? styles.draggingSection : {}) }}>

              <SectionHeader title={SECTION_TITLES[secId]} expanded={expandedSections[secId]} toggle={() => toggleSection(secId)} icon="◆" draggable/>

              {expandedSections[secId] && (
                <div style={{ ...styles.sectionContent, animation: "fadeIn 0.3s ease" }}>
                  {secId === "identity" && (
                    <div style={rs("identityGrid")}>
                      <div style={rs("photoArea")}>
                        <div style={rs("photoFrame")}>
                          {char.photo_url ? <img src={char.photo_url} alt="Agent" style={styles.photoImg}/> : (
                            <div style={styles.photoPlaceholder}>
                              <div style={{ fontSize: 28, marginBottom: 4 }}>⊘</div>
                              <div style={{ fontSize: 9, letterSpacing: 1 }}>NO PHOTO</div>
                              <div style={{ fontSize: 9, letterSpacing: 1 }}>ON FILE</div>
                            </div>
                          )}
                        </div>
                        <div style={{ marginBottom: 4 }}>
                          <label style={{ ...styles.fieldLabel, fontSize: 9 }}>Photo</label>
                          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <label style={styles.photoUploadBtn}>
                              ↑ Upload
                              <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = (ev) => updateChar("photo_url", ev.target.result);
                                reader.readAsDataURL(file);
                                e.target.value = "";
                              }}/>
                            </label>
                            <input type="text" value={char.photo_url?.startsWith("data:") ? "(uploaded)" : (char.photo_url || "")} onChange={(e) => updateChar("photo_url", e.target.value)} placeholder="or paste URL..." style={{ ...styles.textInput, fontSize: 10, flex: 1 }} readOnly={char.photo_url?.startsWith("data:")}/>
                            {char.photo_url && <span onClick={() => updateChar("photo_url", "")} style={{ cursor: "pointer", color: T.stamp, fontSize: 10, opacity: 0.6 }}>✕</span>}
                          </div>
                        </div>
                        {(char.mana_enabled || char.pe_enabled) && (
                          <button onClick={() => setSpellbookOpen(true)} style={styles.spellbookBtn}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginRight: 6, flexShrink: 0 }}>
                              <path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke="#c4a46c" strokeWidth="1.5" strokeLinecap="round"/>
                              <path d="M4 4.5A2.5 2.5 0 016.5 2H20v15H6.5A2.5 2.5 0 004 19.5v-15z" stroke="#c4a46c" strokeWidth="1.5"/>
                              <path d="M9 7h6M9 11h4" stroke="#8b6914" strokeWidth="1" strokeLinecap="round"/>
                              <circle cx="17" cy="6" r="2" fill="#8b2500" opacity="0.6"/>
                            </svg>
                            <span>SPELLBOOK</span>
                            <span style={{ fontSize: 9, opacity: 0.5, marginLeft: 4 }}>({(char.spellbook || []).length})</span>
                          </button>
                        )}
                        <button onClick={() => setCombatRefOpen(true)} style={styles.spellbookBtn}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginRight: 6, flexShrink: 0 }}>
                            <circle cx="12" cy="12" r="9" stroke="#c4a46c" strokeWidth="1.5" fill="none"/>
                            <path d="M12 7v5l3 3" stroke="#8b6914" strokeWidth="1.5" strokeLinecap="round"/>
                            <path d="M7 3L5 5M17 3l2 2" stroke="#c4a46c" strokeWidth="1" strokeLinecap="round"/>
                          </svg>
                          <span>COMBAT REF</span>
                        </button>
                        <button onClick={() => setEquipmentOpen(true)} style={styles.spellbookBtn}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginRight: 6, flexShrink: 0 }}>
                            <rect x="3" y="7" width="18" height="13" rx="2" stroke="#c4a46c" strokeWidth="1.5" fill="none"/>
                            <path d="M8 7V5a4 4 0 018 0v2" stroke="#8b6914" strokeWidth="1.5" fill="none"/>
                            <circle cx="12" cy="14" r="2" fill="#c4a46c" opacity="0.4"/>
                          </svg>
                          <span>EQUIPMENT</span>
                          <span style={{ fontSize: 9, opacity: 0.5, marginLeft: 4 }}>({(char.weapons||[]).length + (char.armor||[]).length})</span>
                        </button>
                      </div>
                      <div style={rs("identityFields")}>
                        <EditableField label="Full Name / Alias" value={char.name} onChange={(v) => updateChar("name", v)}/>
                        <div style={rs("fieldRow")}>
                          <div style={{ flex: "0 0 48%", minWidth: 120, marginBottom: 10 }}>
                            <label style={styles.fieldLabel}>Race</label>
                            <select value={char.race} onChange={(e) => { updateChar("race", e.target.value); const peds = RACES[e.target.value] || []; if (peds.length > 0 && !peds.includes(char.pedigree)) updateChar("pedigree", peds[0]); else if (peds.length === 0) updateChar("pedigree", ""); }} style={styles.selectInput}>
                              {Object.keys(RACES).map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                          </div>
                          <div style={{ flex: "0 0 48%", minWidth: 120, marginBottom: 10 }}>
                            <label style={styles.fieldLabel}>{char.race === "Half-Leecher" ? "Parent Lineage" : "Pedigree"}</label>
                            {(RACES[char.race] || []).length > 0 ? (
                              <select value={char.pedigree} onChange={(e) => updateChar("pedigree", e.target.value)} style={styles.selectInput}>
                                {(RACES[char.race] || []).map(p => <option key={p} value={p}>{p}</option>)}
                              </select>
                            ) : char.race === "Half-Leecher" ? (
                              <select value={char.parent_lineage || ""} onChange={(e) => updateChar("parent_lineage", e.target.value)} style={styles.selectInput}>
                                <option value="">Select parent lineage...</option>
                                <optgroup label="Human Parent">
                                  {RACES["Human"].map(p => <option key={`h-${p}`} value={`Human — ${p}`}>Human — {p}</option>)}
                                </optgroup>
                                <optgroup label="Darkleecher Parent">
                                  {RACES["Darkleecher"].map(p => <option key={`d-${p}`} value={`Darkleecher — ${p}`}>Darkleecher — {p}</option>)}
                                </optgroup>
                              </select>
                            ) : (
                              <div style={{ ...styles.displayValue, fontSize: 12, opacity: 0.5 }}>N/A</div>
                            )}
                          </div>
                        </div>
                        <div style={rs("fieldRow")}>
                          <EditableField label="Faction" value={char.faction || ""} onChange={(v) => updateChar("faction", v)} half placeholder="Trinity Investigations, etc."/>
                          <div style={{ flex: "0 0 48%", minWidth: 120, marginBottom: 10 }}>
                            <label style={styles.fieldLabel}>Background</label>
                            <select value={ALL_BACKGROUNDS.includes(char.background) ? char.background : "__custom__"} onChange={(e) => { if (e.target.value !== "__custom__") updateChar("background", e.target.value); else updateChar("background", ""); }} style={{ ...styles.selectInput, marginBottom: 0 }}>
                              {Object.entries(BACKGROUND_TIERS).map(([tier, data]) => (
                                <optgroup key={tier} label={`${tier} — ${data.desc}`}>
                                  {data.backgrounds.map(b => <option key={b} value={b}>{b}</option>)}
                                </optgroup>
                              ))}
                              <option value="__custom__">Custom...</option>
                            </select>
                            {!ALL_BACKGROUNDS.includes(char.background) && (
                              <input type="text" value={char.background} onChange={(e) => updateChar("background", e.target.value)} style={{ ...styles.textInput, marginTop: 4 }} placeholder="Type custom background..."/>
                            )}
                            {char.background && getBackgroundTier(char.background) && (
                              <div style={{ fontFamily: "'Courier Prime', monospace", fontSize: 9, color: T.accentDim, marginTop: 3 }}>
                                {getBackgroundTier(char.background)[0]} — {getBackgroundTier(char.background)[1].desc}
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={rs("fieldRow")}>
                          <EditableField label="Level" value={char.level} onChange={(v) => updateChar("level", Math.max(0, parseInt(v) || 0))} type="number" quarter/>
                          <EditableField label="CP Total" value={3 + (char.level * 3) + flawsCpGained} type="display" quarter/>
                          <EditableField label="CP Manual" value={char.cp_spent} onChange={(v) => updateChar("cp_spent", parseInt(v) || 0)} type="number" quarter/>
                          <EditableField label="CP Left" value={(3 + char.level * 3 + flawsCpGained) - (char.cp_spent + meritsCpSpent)} type="display" quarter/>
                        </div>
                        <div style={rs("fieldRow")}>
                          <EditableField label="SP / Lv" value={spPerLevel} type="display" quarter/>
                          <EditableField label="SP Total" value={spTotal} type="display" quarter/>
                          <EditableField label="SP Used" value={spSpent} type="display" quarter/>
                          <EditableField label="SP Left" value={spTotal - spSpent} type="display" quarter/>
                        </div>
                        <EditableField label="Manual SP Spent" value={char.sp_spent || 0} onChange={(v) => updateChar("sp_spent", parseInt(v) || 0)} type="number" small/>
                        <div style={{ marginBottom: 10 }}>
                          <label style={styles.fieldLabel}>Languages</label>
                          <div style={styles.propTagWrap}>
                            {(Array.isArray(char.languages) ? char.languages : []).map(lang => (
                              <span key={lang} style={styles.propTag}>
                                {lang}
                                <span onClick={() => updateChar("languages", (char.languages||[]).filter(l => l !== lang))} style={styles.propTagX}>✕</span>
                              </span>
                            ))}
                            {(Array.isArray(char.languages) ? char.languages : []).length === 0 && <span style={{ fontSize: 10, color: T.accentDim, opacity: 0.5 }}>None selected</span>}
                          </div>
                          <LanguagePicker active={Array.isArray(char.languages) ? char.languages : []} onToggle={(lang) => {
                            const cur = Array.isArray(char.languages) ? char.languages : [];
                            updateChar("languages", cur.includes(lang) ? cur.filter(l => l !== lang) : [...cur, lang]);
                          }}/>
                        </div>
                        <div style={rs("fieldRow")}>
                          <div style={{ flex: 1 }}>
                            <label style={styles.fieldLabel}>Primary Attribute</label>
                            <select value={char.primary_attr} onChange={(e) => updateChar("primary_attr", e.target.value)} style={styles.selectInput}>
                              {ATTR_LIST.map(a => <option key={a} value={a}>{a} — {ATTR_FULL[a]}</option>)}
                            </select>
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={styles.fieldLabel}>Secondary Attribute</label>
                            <select value={char.secondary_attr} onChange={(e) => updateChar("secondary_attr", e.target.value)} style={styles.selectInput}>
                              {ATTR_LIST.map(a => <option key={a} value={a}>{a} — {ATTR_FULL[a]}</option>)}
                            </select>
                          </div>
                        </div>
                        <div style={rs("fieldRow")}>
                          <CheckboxField label="Mancer Branded" checked={char.mancer_branded} onChange={(v) => updateChar("mancer_branded", v)}/>
                          {char.mancer_branded && (
                            <div style={{ flex: "0 0 23%", minWidth: 80, marginBottom: 10 }}>
                              <label style={styles.fieldLabel}>Mancer Type</label>
                              <select value={char.mancer_type} onChange={(e) => updateChar("mancer_type", e.target.value)} style={styles.selectInput}>
                                <option value="">Select...</option>
                                {MANCY_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
                              </select>
                            </div>
                          )}
                          {char.mancer_branded && <EditableField label="Mancer Level" value={char.mancer_level || 0} onChange={(v) => updateChar("mancer_level", parseInt(v) || 0)} type="number" quarter/>}
                        </div>
                        <div style={rs("fieldRow")}>
                          <CheckboxField label="Arcane Caster (Mana)" checked={char.mana_enabled} onChange={(v) => updateChar("mana_enabled", v)}/>
                          <CheckboxField label="Sensitive / Mancer (PE)" checked={char.pe_enabled} onChange={(v) => updateChar("pe_enabled", v)}/>
                        </div>
                      </div>
                    </div>
                  )}

                  {secId === "attributes" && (
                    <div style={rs("attrGrid")}>
                      {ATTR_LIST.map(attr => {
                        const score = char.attrs[attr]; const cap = (char.attr_caps || {})[attr] || 18;
                        const mod = getModifier(score); const isPrimary = char.primary_attr === attr; const isSecondary = char.secondary_attr === attr;
                        return (
                          <div key={attr} style={{ ...styles.attrCard, ...(isPrimary ? styles.attrPrimary : isSecondary ? styles.attrSecondary : {}) }}>
                            {isPrimary && <div style={styles.attrBadge}>PRI</div>}
                            {isSecondary && <div style={styles.attrBadge}>SEC</div>}
                            <Tooltip text={ATTR_TIPS[attr]}>
                              <div style={{ ...styles.attrName, cursor: "help" }}>{attr}</div>
                            </Tooltip>
                            <div style={styles.attrFull}>{ATTR_FULL[attr]}</div>
                            <input type="number" value={score} onChange={(e) => updateChar(`attrs.${attr}`, parseInt(e.target.value) || 1)} style={styles.attrScoreInput} min="1" max={cap}/>
                            <div style={styles.attrMod}>{fmtMod(mod)}</div>
                            <div style={styles.attrCapRow}>
                              <span style={styles.attrCapLabel}>CAP</span>
                              <input type="number" value={cap} onChange={(e) => updateChar(`attr_caps.${attr}`, parseInt(e.target.value) || 1)} style={styles.attrCapInput} min="1" max="30"/>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {secId === "combat" && (<>
                    <div style={rs("combatGrid")}>
                      <StatBox label="HP" sub="Hit Points" tip={STAT_TIPS.HP}>
                        <div style={styles.statRow}>
                          <input type="number" value={char.hp_current} onChange={(e) => updateChar("hp_current", parseInt(e.target.value) || 0)} style={styles.statInput}/>
                          <span style={styles.statSlash}>/</span>
                          <input type="number" value={char.hp_max} onChange={(e) => updateChar("hp_max", parseInt(e.target.value) || 1)} style={styles.statInput}/>
                        </div>
                        <HpBar current={char.hp_current} max={char.hp_max}/>
                        <EditableField label="Temp HP" value={char.hp_temp || 0} onChange={(v) => updateChar("hp_temp", parseInt(v) || 0)} type="number" small/>
                      </StatBox>
                      <StatBox label="EVA" sub="Evasion" tip={STAT_TIPS.EVA}>
                        <div style={styles.statBig}>{eva}</div>
                        <div style={styles.statFormula}>10 + DEX({fmtMod(getModifier(char.attrs.DEX))}){char.evasion_bonus ? ` + ${char.evasion_bonus}` : ""}</div>
                        <EditableField label="EVA Bonus" value={char.evasion_bonus || 0} onChange={(v) => updateChar("evasion_bonus", parseInt(v) || 0)} type="number" small/>
                      </StatBox>
                      <StatBox label="INIT" sub="Initiative" tip={STAT_TIPS.INIT}>
                        <div style={styles.statBig}>{fmtMod(initiative + (char.init_bonus || 0))}</div>
                        <div style={styles.statFormula}>DEX({fmtMod(initiative)}){char.init_bonus ? ` + ${char.init_bonus}` : ""}</div>
                        <EditableField label="INIT Bonus" value={char.init_bonus || 0} onChange={(v) => updateChar("init_bonus", parseInt(v) || 0)} type="number" small/>
                      </StatBox>
                      <StatBox label="MOV" sub="Movement" tip={STAT_TIPS.MOV}>
                        <input type="number" value={char.movement} onChange={(e) => updateChar("movement", parseInt(e.target.value) || 0)} style={styles.statInputLg}/>
                        <div style={styles.statUnit}>ft</div>
                      </StatBox>
                      <StatBox label="REC" sub="Recovery Die" tip={STAT_TIPS.REC}>
                        <input type="text" value={char.recovery_die} onChange={(e) => updateChar("recovery_die", e.target.value)} style={styles.statInputText}/>
                        <div style={styles.statFormula}>+ CON({fmtMod(getModifier(char.attrs.CON))})</div>
                      </StatBox>
                      <StatBox label="DMG" sub="Damage Mod" tip={STAT_TIPS.DMG}>
                        <input type="number" value={char.damage_mod || 0} onChange={(e) => updateChar("damage_mod", parseInt(e.target.value) || 0)} style={styles.statInputLg}/>
                      </StatBox>
                    </div>
                    <div style={rs("combatGrid")}>
                      <StatBox label="FTG" sub="Fatigue (5 = death)" tip={STAT_TIPS.FTG}>
                        <div style={styles.fatigueRow}>
                          {[1,2,3,4,5].map(n => (
                            <button key={n} onClick={() => updateChar("fatigue", (char.fatigue || 0) === n ? n - 1 : n)}
                              style={{ ...styles.fatigueDot, ...((char.fatigue || 0) >= n ? styles.fatigueFilled : {}), ...(n === 5 && (char.fatigue || 0) >= 5 ? styles.fatigueDeath : {}) }}>
                              {n}
                            </button>
                          ))}
                        </div>
                      </StatBox>
                      {char.mana_enabled && (
                        <StatBox label="MANA" sub="Arcane Pool" tip={STAT_TIPS.MANA}>
                          <div style={styles.statRow}>
                            <input type="number" value={char.mana_current || 0} onChange={(e) => updateChar("mana_current", parseInt(e.target.value) || 0)} style={styles.statInput}/>
                            <span style={styles.statSlash}>/</span>
                            <div style={styles.sanityMax}>{manaMax}</div>
                          </div>
                          <div style={styles.statFormula}>INT({char.attrs.INT}) + PMod({fmtMod(getModifier(char.attrs[char.primary_attr]))}) + SMod({fmtMod(getModifier(char.attrs[char.secondary_attr]))})</div>
                        </StatBox>
                      )}
                      {char.pe_enabled && (
                        <StatBox label="PE" sub="Psychic Energy" tip={STAT_TIPS.PE}>
                          <div style={styles.statRow}>
                            <input type="number" value={char.pe_current || 0} onChange={(e) => updateChar("pe_current", parseInt(e.target.value) || 0)} style={styles.statInput}/>
                            <span style={styles.statSlash}>/</span>
                            <div style={styles.sanityMax}>{peMax}</div>
                          </div>
                          <div style={styles.statFormula}>CON({char.attrs.CON}) + PMod({fmtMod(getModifier(char.attrs[char.primary_attr]))}) + MLv({char.mancer_level || 0})</div>
                        </StatBox>
                      )}
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <EditableField label="Damage Resistance (type, level, properties)" value={char.damage_resistance || ""} onChange={(v) => updateChar("damage_resistance", v)} placeholder="e.g. DR 2 vs Piercing (Heavy Coat)"/>
                      <EditableField label="Status Effects" value={char.status_effects || ""} onChange={(v) => updateChar("status_effects", v)} placeholder="Active statuses..."/>
                    </div>
                  </>)}

                  {secId === "sanity" && (
                    <div style={rs("sanityBlock")}>
                      <div style={styles.sanityMain}>
                        <div style={styles.sanityLabel}>SANITY</div>
                        <div style={styles.sanityRow}>
                          <input type="number" value={char.sanity_current} onChange={(e) => updateChar("sanity_current", parseInt(e.target.value) || 0)} style={styles.sanityInput}/>
                          <span style={styles.statSlash}>/</span>
                          <div style={styles.sanityMax}>{sanMax}</div>
                        </div>
                        <HpBar current={char.sanity_current} max={sanMax} color={T.accent}/>
                        <div style={styles.statFormula}>Max = WIS({char.attrs.WIS}) × 5</div>
                      </div>
                      <div style={styles.sanityDCs}>
                        <div style={styles.sanityDCTitle}>SAVE DC's</div>
                        {SANITY_TYPES.map(type => (
                          <div key={type} style={styles.sanityDCRow}>
                            <span style={styles.sanityDCLabel}>{type}</span>
                            <select value={char.sanity_dcs[type]} onChange={(e) => updateChar(`sanity_dcs.${type}`, parseInt(e.target.value))} style={styles.sanityDCSelect}>
                              <option value={7}>DC 7 (Strong)</option>
                              <option value={10}>DC 10 (Average)</option>
                              <option value={13}>DC 13 (Weak)</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {secId === "skills" && (<>
                    <div style={styles.skillsInfoBar}>
                      <span style={styles.skillsInfoItem}>Trained: {trainedList.length}/{char.trained_skill_cap || 9}</span>
                      <span style={styles.skillsInfoItem}>SP: {spSpent}/{spTotal} used</span>
                      <span style={styles.skillsInfoHint}>◆ = Trained (1 SP/rank) | ◇ = Untrained (2 SP/rank)</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ ...styles.skillsInfoHint, marginLeft: 0 }}>Trained cap:</span>
                        <input type="number" value={char.trained_skill_cap || 9} onChange={(e) => updateChar("trained_skill_cap", parseInt(e.target.value) || 9)}
                          style={{ width: 32, background: "transparent", border: "none", borderBottom: `1px solid ${T.accentDark}`, color: T.accent, fontFamily: "'Courier Prime', monospace", fontSize: 11, textAlign: "center", outline: "none" }} min="1"/>
                      </div>
                    </div>
                    <div style={rs("skillsGrid")}>
                      {ATTR_LIST.map(attr => {
                        const mod = getModifier(char.attrs[attr]);
                        return (
                        <div key={attr} style={styles.skillGroup}>
                          <div style={styles.skillGroupHeader}>{ATTR_FULL[attr]} ({attr}) mod: {fmtMod(mod)} | max ranks: {char.attrs[attr]}</div>
                          {SKILL_MAP[attr].map(skill => {
                            if (skill === "Knowledge" || skill === "Craft") {
                              const isKnowledge = skill === "Knowledge";
                              const types = isKnowledge ? knowledgeTypes : craftTypes;
                              const addFn = isKnowledge ? addKnowledgeType : addCraftType;
                              const removeFn = isKnowledge ? removeKnowledgeType : removeCraftType;
                              const prefix = isKnowledge ? "Knowledge" : "Craft";
                              return (
                                <div key={`${skill}-block`}>
                                  <Tooltip text={SKILL_TIPS[skill]}>
                                    <div style={{ ...styles.knowledgeHeader, cursor: "help" }}>{skill} Specializations</div>
                                  </Tooltip>
                                  {types.map(t => {
                                    const key = `${prefix}_-_${t.replace(/\s/g, "_")}`;
                                    const ranks = (char.trained_skills || {})[key] || 0;
                                    const isTrained = trainedList.includes(key); const cap = char.attrs[attr]; const atCap = ranks >= cap; const total = ranks + mod;
                                    return (
                                      <div key={key} style={styles.skillRow}>
                                        <button onClick={() => toggleTrainedSkill(key)} style={{ ...styles.skillTrainedBtn, ...(isTrained ? styles.skillTrainedActive : {}) }}>{isTrained ? "◆" : "◇"}</button>
                                        <span style={{ ...styles.skillName, ...(ranks > 0 ? styles.skillHasRanks : {}), flex: 1 }}>{prefix[0]}: {t}</span>
                                        <div style={styles.skillControls}>
                                          <button onClick={() => adjustSkillRank(key, attr, -1)} style={styles.skillBtn} disabled={ranks <= 0}>−</button>
                                          <span style={styles.skillRanks}>{ranks}</span>
                                          <button onClick={() => adjustSkillRank(key, attr, 1)} style={{ ...styles.skillBtn, ...(atCap ? styles.skillBtnDisabled : {}) }} disabled={atCap}>+</button>
                                          <span style={styles.skillTotal}>{fmtMod(total)}</span>
                                          <span style={styles.skillCost}>{isTrained ? ranks : ranks * 2}sp</span>
                                          <button onClick={() => removeFn(t)} style={styles.knowledgeRemoveBtn}>✕</button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {isKnowledge ? <KnowledgeAdder onAdd={addFn}/> : <CraftAdder onAdd={addFn}/>}
                                </div>
                              );
                            }
                            const key = skill.replace(/\s/g, "_");
                            const ranks = (char.trained_skills || {})[key] || 0;
                            const isTrained = trainedList.includes(key); const cap = char.attrs[attr]; const atCap = ranks >= cap; const total = ranks + mod;
                            return (
                              <div key={skill} style={styles.skillRow}>
                                <button onClick={() => toggleTrainedSkill(key)} style={{ ...styles.skillTrainedBtn, ...(isTrained ? styles.skillTrainedActive : {}) }} title={isTrained ? "Trained (1 SP/rank)" : "Untrained (2 SP/rank)"}>{isTrained ? "◆" : "◇"}</button>
                                <Tooltip text={SKILL_TIPS[skill]}>
                                  <span style={{ ...styles.skillName, ...(ranks > 0 ? styles.skillHasRanks : {}), flex: 1, cursor: SKILL_TIPS[skill] ? "help" : "default" }}>{skill}</span>
                                </Tooltip>
                                <div style={styles.skillControls}>
                                  <button onClick={() => adjustSkillRank(key, attr, -1)} style={styles.skillBtn} disabled={ranks <= 0}>−</button>
                                  <span style={styles.skillRanks}>{ranks}</span>
                                  <button onClick={() => adjustSkillRank(key, attr, 1)} style={{ ...styles.skillBtn, ...(atCap ? styles.skillBtnDisabled : {}) }} disabled={atCap}>+</button>
                                  <span style={styles.skillTotal}>{fmtMod(total)}</span>
                                  <span style={styles.skillCost}>{isTrained ? ranks : ranks * 2}sp</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        );
                      })}
                    </div>
                  </>)}

                  {secId === "merits" && (
                    <div style={{ display: "flex", gap: 12 }}>
                      <div style={{ ...styles.mfBlock, flex: 1, overflow: "hidden" }}>
                        <div style={styles.mfHeader}>
                          <span style={styles.mfTitle}>MERITS</span>
                          <span style={styles.mfCpBadge}>{meritsCpSpent} / 9 CP</span>
                        </div>
                        {(char.merits || []).map(m => (
                          <div key={m.id}>
                            <div style={styles.mfEntry}>
                              <span style={styles.mfCost}>-{m.cost}</span>
                              <input type="text" value={m.name} onChange={(e) => updateMerit(m.id, "name", e.target.value)} placeholder="Merit name..." style={{ ...styles.textInput, flex: 1, fontWeight: 700 }}/>
                              <select value={m.cost} onChange={(e) => updateMerit(m.id, "cost", parseInt(e.target.value))} style={styles.mfCostSelect}>
                                {[1,2,3,4,5].map(n => <option key={n} value={n}>-{n} CP</option>)}
                              </select>
                              <button onClick={() => removeMerit(m.id)} style={styles.weaponRemoveBtn}>✕</button>
                            </div>
                            {m.name && (
                              <div style={{ paddingLeft: 36, marginTop: -4, marginBottom: 8 }}>
                                <input type="text" value={m.desc || ""} onChange={(e) => updateMerit(m.id, "desc", e.target.value)} placeholder="Description / effect..."
                                  style={{ ...styles.textInput, fontSize: 10, color: T.accentDim }}/>
                              </div>
                            )}
                          </div>
                        ))}
                        <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                          <select onChange={(e) => { if (!e.target.value) return; const [cost, name] = JSON.parse(e.target.value); addMerit(name, cost); e.target.value = ""; }} style={{ ...styles.selectInput, flex: 1, fontSize: 10, marginBottom: 0 }}>
                            <option value="">+ Add Merit from book...</option>
                            {Object.entries(MERIT_LIST).map(([cat, merits]) => (
                              <optgroup key={cat} label={cat}>
                                {merits.map(([c, n]) => <option key={n} value={JSON.stringify([c,n])}>(-{c}) {n}</option>)}
                              </optgroup>
                            ))}
                          </select>
                          <button onClick={() => addMerit("", 1)} style={{ ...styles.weaponAddBtn, flexShrink: 0, margin: 0 }}>+ Custom</button>
                        </div>
                      </div>

                      <div style={{ ...styles.mfBlock, flex: 1, overflow: "hidden" }}>
                        <div style={styles.mfHeader}>
                          <span style={styles.mfTitle}>FLAWS</span>
                          <span style={{ ...styles.mfCpBadge, color: T.accent }}>+{flawsCpGained} / 9 CP</span>
                        </div>
                        {(char.flaws || []).map(f => (
                          <div key={f.id}>
                            <div style={styles.mfEntry}>
                              <span style={{ ...styles.mfCost, color: T.accent }}>+{f.cost}</span>
                              <input type="text" value={f.name} onChange={(e) => updateFlaw(f.id, "name", e.target.value)} placeholder="Flaw name..." style={{ ...styles.textInput, flex: 1, fontWeight: 700 }}/>
                              <select value={f.cost} onChange={(e) => updateFlaw(f.id, "cost", parseInt(e.target.value))} style={styles.mfCostSelect}>
                                {[1,2,3,4,5].map(n => <option key={n} value={n}>+{n} CP</option>)}
                              </select>
                              <button onClick={() => removeFlaw(f.id)} style={styles.weaponRemoveBtn}>✕</button>
                            </div>
                            {f.name && (
                              <div style={{ paddingLeft: 36, marginTop: -4, marginBottom: 8 }}>
                                <input type="text" value={f.desc || ""} onChange={(e) => updateFlaw(f.id, "desc", e.target.value)} placeholder="Description / effect..."
                                  style={{ ...styles.textInput, fontSize: 10, color: T.accentDim }}/>
                              </div>
                            )}
                          </div>
                        ))}
                        <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                          <select onChange={(e) => { if (!e.target.value) return; const [cost, name] = JSON.parse(e.target.value); addFlaw(name, cost); e.target.value = ""; }} style={{ ...styles.selectInput, flex: 1, fontSize: 10, marginBottom: 0 }}>
                            <option value="">+ Add Flaw from book...</option>
                            {Object.entries(FLAW_LIST).map(([cat, flaws]) => (
                              <optgroup key={cat} label={cat}>
                                {flaws.map(([c, n]) => <option key={n} value={JSON.stringify([c,n])}>(+{c}) {n}</option>)}
                              </optgroup>
                            ))}
                          </select>
                          <button onClick={() => addFlaw("", 1)} style={{ ...styles.weaponAddBtn, flexShrink: 0, margin: 0 }}>+ Custom</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {secId === "abilities" && (
                    <div>
                      {(char.ability_list || []).map(a => (
                        <div key={a.id}>
                          <div style={styles.mfEntry}>
                            <input type="text" value={a.name} onChange={(e) => updateAbility(a.id, "name", e.target.value)} placeholder="Ability name..." style={{ ...styles.textInput, flex: 1, fontWeight: 700 }}/>
                            <input type="text" value={a.cost || ""} onChange={(e) => updateAbility(a.id, "cost", e.target.value)} placeholder="CP" style={{ ...styles.textInput, width: 40, textAlign: "center", flexShrink: 0 }}/>
                            <button onClick={() => removeAbility(a.id)} style={styles.weaponRemoveBtn}>✕</button>
                          </div>
                          {a.name && (
                            <div style={{ paddingLeft: 8, marginTop: -4, marginBottom: 8 }}>
                              <input type="text" value={a.desc || ""} onChange={(e) => updateAbility(a.id, "desc", e.target.value)} placeholder="Effect / description..."
                                style={{ ...styles.textInput, fontSize: 10, color: T.accentDim, width: "100%" }}/>
                            </div>
                          )}
                        </div>
                      ))}
                      <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                        <select onChange={(e) => { if (!e.target.value) return; addAbility(e.target.value); e.target.value = ""; }} style={{ ...styles.selectInput, flex: 1, fontSize: 10, marginBottom: 0 }}>
                          <option value="">+ Add Ability from book...</option>
                          {Object.entries(ABILITY_LIST).map(([cat, abilities]) => (
                            <optgroup key={cat} label={cat}>
                              {abilities.map(n => <option key={n} value={n}>{n}</option>)}
                            </optgroup>
                          ))}
                        </select>
                        <button onClick={() => addAbility("")} style={{ ...styles.weaponAddBtn, flexShrink: 0, margin: 0 }}>+ Custom</button>
                      </div>
                      <div style={{ marginTop: 12 }}>
                        <label style={styles.fieldLabel}>Ability Notes</label>
                        <textarea value={char.abilities || ""} onChange={(e) => updateChar("abilities", e.target.value)} style={styles.textArea} rows={2} placeholder="Additional notes, homebrew abilities..."/>
                      </div>
                    </div>
                  )}

                  {TEXT_SECTIONS[secId] && TEXT_SECTIONS[secId].map(f => (
                    <div key={f.key} style={{ marginBottom: 12 }}>
                      <label style={styles.fieldLabel}>{f.label}</label>
                      <textarea value={char[f.key]} onChange={(e) => updateChar(f.key, e.target.value)}
                        style={styles.textarea} rows={5} placeholder={`Enter ${f.label.toLowerCase()}...`}/>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* FOOTER */}
          <div style={styles.dossierFooter}>
            <div style={styles.footerLine}/>
            <div style={styles.footerText}>
              {firmName} — {firmSub} — CASE NO. R&L-{char.id.replace(/\D/g,"").padStart(3,"0")}-{String(char.level).padStart(2,"0")}-TRI — CLEARANCE: RESTRICTED
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 12 }}>
              <button onClick={() => setPrintMode(true)} style={styles.printBtn}>⎙ View Printable Dossier</button>
              <button onClick={resetAll} onMouseLeave={() => setConfirmReset(false)} style={{ ...styles.resetBtn, ...(confirmReset ? { opacity: 1, borderColor: T.stamp, color: T.stamp } : {}) }}>{confirmReset ? "✓ Click again to confirm reset" : "⟲ Reset All Dossiers"}</button>
            </div>
          </div>
        </div>
      </div>

      {/* JOURNAL OVERLAY */}
      {journalOpen && (
        <div style={styles.journalOverlay} onClick={(e) => { if (e.target === e.currentTarget) { setJournalOpen(false); setJournalEdit(null); setJournalDraft({ title: "", session: "", content: "" }); }}}>
          <div style={styles.journalPage}>
            {/* Typewriter page decorations */}
            <div style={styles.jpHoles}>
              {[...Array(12)].map((_, i) => <div key={i} style={styles.jpHole}/>)}
            </div>
            <div style={styles.jpRedLine}/>
            <div style={styles.jpContent}>
              {/* Header */}
              <div style={styles.jpHeader}>
                <div style={styles.jpLogo}>{firmName}</div>
                <div style={styles.jpLogoSub}>{firmSub}</div>
                <div style={styles.jpDivider}/>
                <div style={styles.jpAgent}>{char.name}</div>
                <div style={styles.jpAgentSub}>{char.race}{char.pedigree ? ` — ${char.pedigree}` : ""} | Level {char.level}</div>
                <div style={styles.jpFieldJournal}>FIELD JOURNAL</div>
              </div>

              {/* Toolbar */}
              <div style={styles.jpToolbar}>
                <div style={styles.jpToolbarLeft}>
                  <span style={styles.jpEntryCount}>{(char.journal || []).length} {(char.journal || []).length === 1 ? "entry" : "entries"}</span>
                </div>
                <div style={styles.jpToolbarRight}>
                  <button onClick={exportJournalPDF} style={styles.jpExportBtn}>↓ Export .html</button>
                  <button onClick={exportJournalText} style={styles.jpExportBtn}>↓ Download .txt</button>
                  <button onClick={() => { setJournalOpen(false); setJournalEdit(null); setJournalDraft({ title: "", session: "", content: "" }); }} style={styles.jpCloseBtn}>✕ Close</button>
                </div>
              </div>

              {/* New entry form */}
              {journalEdit === null && (
                <div style={styles.jpNewEntry}>
                  <div style={styles.jpNewEntryHeader}>— NEW ENTRY —</div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                    <div style={{ flex: 2, minWidth: 180 }}>
                      <label style={styles.jpLabel}>Title</label>
                      <input type="text" value={journalDraft.title} onChange={(e) => setJournalDraft(d => ({ ...d, title: e.target.value }))}
                        placeholder="Entry title..." style={styles.jpInput}/>
                    </div>
                    <div style={{ flex: "0 0 100px" }}>
                      <label style={styles.jpLabel}>Session #</label>
                      <input type="text" value={journalDraft.session} onChange={(e) => setJournalDraft(d => ({ ...d, session: e.target.value }))}
                        placeholder="e.g. 3" style={styles.jpInput}/>
                    </div>
                  </div>
                  <label style={styles.jpLabel}>Content</label>
                  <textarea value={journalDraft.content} onChange={(e) => setJournalDraft(d => ({ ...d, content: e.target.value }))}
                    style={styles.jpTextarea} rows={8} placeholder="What happened this session..."/>
                  <button onClick={addJournalEntry} style={styles.jpAddBtn}>+ ADD ENTRY</button>
                </div>
              )}

              {/* Entries */}
              <div style={styles.jpEntries}>
                {(char.journal || []).sort((a,b) => (b.timestamp||0) - (a.timestamp||0)).map(entry => (
                  <div key={entry.id} style={styles.jpEntry}>
                    {journalEdit === entry.id ? (
                      <div>
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                          <div style={{ flex: 2, minWidth: 180 }}>
                            <label style={styles.jpLabel}>Title</label>
                            <input type="text" value={journalDraft.title} onChange={(e) => setJournalDraft(d => ({ ...d, title: e.target.value }))}
                              style={styles.jpInput}/>
                          </div>
                          <div style={{ flex: "0 0 100px" }}>
                            <label style={styles.jpLabel}>Session #</label>
                            <input type="text" value={journalDraft.session} onChange={(e) => setJournalDraft(d => ({ ...d, session: e.target.value }))}
                              style={styles.jpInput}/>
                          </div>
                        </div>
                        <label style={styles.jpLabel}>Content</label>
                        <textarea value={journalDraft.content} onChange={(e) => setJournalDraft(d => ({ ...d, content: e.target.value }))}
                          style={styles.jpTextarea} rows={8}/>
                        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                          <button onClick={() => updateJournalEntry(entry.id)} style={styles.jpAddBtn}>✓ SAVE</button>
                          <button onClick={cancelEditEntry} style={styles.jpCancelBtn}>✕ CANCEL</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={styles.jpEntryHead}>
                          <div style={{ flex: 1 }}>
                            <div style={styles.jpEntryTitle}>{entry.title}</div>
                            <div style={styles.jpEntryMeta}>{entry.date}{entry.session && entry.session !== "—" ? ` — Session ${entry.session}` : ""}</div>
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => startEditEntry(entry)} style={styles.jpActionBtn}>✎</button>
                            <button onClick={() => deleteJournalEntry(entry.id)} onMouseLeave={() => setConfirmDeleteEntry(null)} style={{ ...styles.jpActionBtn, color: confirmDeleteEntry === entry.id ? "#f4efe6" : "#8b2500", borderColor: "#8b250066", background: confirmDeleteEntry === entry.id ? "#8b2500" : "transparent" }}>{confirmDeleteEntry === entry.id ? "✓" : "✕"}</button>
                          </div>
                        </div>
                        <div style={styles.jpEntryBody}>{entry.content}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {(char.journal || []).length === 0 && !journalEdit && (
                <div style={styles.jpEmpty}>No entries on file. Begin your record above.</div>
              )}

              {/* Page footer */}
              <div style={styles.jpFooter}>
                {firmName} — CLASSIFIED
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SPELLBOOK OVERLAY */}
      {spellbookOpen && (
        <div style={styles.journalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setSpellbookOpen(false); }}>
          <div style={styles.journalPage}>
            <div style={styles.jpHoles}>
              {[...Array(12)].map((_, i) => <div key={i} style={styles.jpHole}/>)}
            </div>
            <div style={styles.jpRedLine}/>
            <div style={styles.jpContent}>
              <div style={styles.jpHeader}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style={{ margin: "0 auto 8px" }}>
                  <path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke="#4a3c2a" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M4 4.5A2.5 2.5 0 016.5 2H20v15H6.5A2.5 2.5 0 004 19.5v-15z" stroke="#4a3c2a" strokeWidth="1.5"/>
                  <path d="M9 7h6M9 11h4" stroke="#8b6914" strokeWidth="1" strokeLinecap="round"/>
                  <circle cx="17" cy="6" r="2" fill="#8b2500" opacity="0.5"/>
                </svg>
                <div style={styles.jpLogo}>SPELLBOOK</div>
                <div style={styles.jpLogoSub}>{char.name}</div>
                <div style={styles.jpDivider}/>
                <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 10, color: "#8b7355", letterSpacing: 2, marginTop: 4 }}>
                  {char.mana_enabled && "ARCANE CASTER"}{char.mana_enabled && char.pe_enabled && " · "}{char.pe_enabled && `MANCER${char.mancer_type ? " — " + char.mancer_type : ""}`}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {char.mana_enabled && (
                  <button onClick={() => addSpell("spell")} style={styles.spellAddBtn}>+ Add Spell / Ritual</button>
                )}
                {char.pe_enabled && (
                  <button onClick={() => addSpell("mancy")} style={styles.spellAddBtn}>+ Add Mancy Ability</button>
                )}
              </div>

              <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
                {(char.spellbook || []).map(spell => (
                  <div key={spell.id} style={styles.spellCard}>
                    <div style={styles.spellCardHeader}>
                      <input type="text" value={spell.name} onChange={(e) => updateSpell(spell.id, "name", e.target.value)} placeholder={spell.kind === "spell" ? "Spell / Ritual name..." : "Mancy ability name..."} style={styles.spellNameInput}/>
                      <span style={styles.spellKindBadge}>{spell.kind === "spell" ? "SPELL" : "MANCY"}</span>
                      <button onClick={() => removeSpell(spell.id)} style={styles.spellRemoveBtn}>✕</button>
                    </div>

                    {spell.kind === "spell" ? (
                      <div style={styles.spellFields}>
                        <div style={styles.spellFieldRow}>
                          <div style={styles.spellField}><label style={styles.spellFieldLabel}>Domain</label>
                            <select value={spell.domain} onChange={(e) => updateSpell(spell.id, "domain", e.target.value)} style={styles.spellSelect}>
                              {OCCULT_DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select></div>
                          <div style={styles.spellField}><label style={styles.spellFieldLabel}>Tier</label>
                            <select value={spell.tier} onChange={(e) => updateSpell(spell.id, "tier", parseInt(e.target.value))} style={styles.spellSelect}>
                              {SPELL_TIERS.map(t => <option key={t} value={t}>Tier {t}</option>)}
                            </select></div>
                          <div style={styles.spellField}><label style={styles.spellFieldLabel}>Mana Cost</label>
                            <input type="text" value={spell.cost} onChange={(e) => updateSpell(spell.id, "cost", e.target.value)} placeholder="3" style={styles.spellInput}/></div>
                          <div style={styles.spellField}><label style={styles.spellFieldLabel}>Save</label>
                            <input type="text" value={spell.save} onChange={(e) => updateSpell(spell.id, "save", e.target.value)} placeholder="DC 13" style={styles.spellInput}/></div>
                        </div>
                        <div style={styles.spellFieldRow}>
                          <div style={styles.spellField}><label style={styles.spellFieldLabel}>Range</label>
                            <input type="text" value={spell.range} onChange={(e) => updateSpell(spell.id, "range", e.target.value)} placeholder="Line of Sight" style={styles.spellInput}/></div>
                          <div style={styles.spellField}><label style={styles.spellFieldLabel}>Duration</label>
                            <input type="text" value={spell.duration} onChange={(e) => updateSpell(spell.id, "duration", e.target.value)} placeholder="Instantaneous" style={styles.spellInput}/></div>
                          <div style={styles.spellField}><label style={styles.spellFieldLabel}>Casting Time</label>
                            <input type="text" value={spell.casting_time} onChange={(e) => updateSpell(spell.id, "casting_time", e.target.value)} placeholder="Standard Action" style={styles.spellInput}/></div>
                          <div style={styles.spellField}><label style={styles.spellFieldLabel}>Risk</label>
                            <input type="text" value={spell.risk} onChange={(e) => updateSpell(spell.id, "risk", e.target.value)} placeholder="5" style={styles.spellInput}/></div>
                        </div>
                        <div style={styles.spellFieldRow}>
                          <div style={{ ...styles.spellField, flex: 1 }}><label style={styles.spellFieldLabel}>Keywords</label>
                            <input type="text" value={spell.keywords} onChange={(e) => updateSpell(spell.id, "keywords", e.target.value)} placeholder="Single Target, Debuff, AoE..." style={styles.spellInput}/></div>
                        </div>
                        <div><label style={styles.spellFieldLabel}>Effect</label>
                          <textarea value={spell.desc} onChange={(e) => updateSpell(spell.id, "desc", e.target.value)} placeholder="Describe the spell effect..." style={styles.spellTextarea} rows={3}/></div>
                      </div>
                    ) : (
                      <div style={styles.spellFields}>
                        <div style={styles.spellFieldRow}>
                          <div style={styles.spellField}><label style={styles.spellFieldLabel}>Mancy Type</label>
                            <select value={spell.mancy_type} onChange={(e) => updateSpell(spell.id, "mancy_type", e.target.value)} style={styles.spellSelect}>
                              {MANCY_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
                            </select></div>
                          <div style={styles.spellField}><label style={styles.spellFieldLabel}>Level</label>
                            <select value={spell.level} onChange={(e) => updateSpell(spell.id, "level", parseInt(e.target.value))} style={styles.spellSelect}>
                              {MANCY_LEVELS.map(l => <option key={l} value={l}>Level {l}</option>)}
                            </select></div>
                          <div style={styles.spellField}><label style={styles.spellFieldLabel}>PE Cost</label>
                            <input type="text" value={spell.pe_cost} onChange={(e) => updateSpell(spell.id, "pe_cost", e.target.value)} placeholder="1-10" style={styles.spellInput}/></div>
                        </div>
                        <div><label style={styles.spellFieldLabel}>Effect</label>
                          <textarea value={spell.desc} onChange={(e) => updateSpell(spell.id, "desc", e.target.value)} placeholder="Describe the mancy ability..." style={styles.spellTextarea} rows={3}/></div>
                      </div>
                    )}
                  </div>
                ))}

                {(char.spellbook || []).length === 0 && (
                  <div style={styles.jpEmpty}>No spells or abilities recorded. Add entries above.</div>
                )}
              </div>

              <div style={styles.jpFooter}>
                {firmName} — OCCULT REGISTRY — RESTRICTED ACCESS
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT OVERLAY */}
      {printMode && (
        <div style={styles.printOverlay}>
          <div style={styles.printControls}>
            <span style={{ fontFamily: "'Special Elite', cursive", fontSize: 12, color: "#8b7355", letterSpacing: 2 }}>Use Ctrl+P / Cmd+P to print, then close.</span>
            <button onClick={() => setPrintMode(false)} style={{ ...styles.printBtn, opacity: 1, fontSize: 12, padding: "8px 20px" }}>✕ Close</button>
          </div>
          <div style={styles.printPage}>
            <div style={{ textAlign: "center", borderBottom: "3px double #8b7355", paddingBottom: 20, marginBottom: 24 }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 900, color: "#4a3c2a", letterSpacing: 4 }}>{firmName}</div>
              <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 9, letterSpacing: 5, color: "#8b7355", marginTop: 3 }}>{firmSub}</div>
              <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 18, marginTop: 14, color: "#4a3c2a", letterSpacing: 2 }}>{char.name}</div>
              <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 11, color: "#8b7355", marginTop: 4 }}>{char.race}{char.pedigree ? " — " + char.pedigree : ""} | Level {char.level} | {char.faction || "Unaffiliated"}</div>
              <div style={{ fontFamily: "'Special Elite', cursive", color: "#8b2500", border: "3px solid #8b2500", display: "inline-block", padding: "2px 16px", transform: "rotate(-5deg)", fontSize: 13, letterSpacing: 3, opacity: 0.5, marginTop: 10 }}>SOUL BOUND</div>
              {char.mancer_branded && <div style={{ fontFamily: "'Special Elite', cursive", color: "#8b2500", border: "2px solid #8b2500", display: "inline-block", padding: "2px 10px", fontSize: 10, letterSpacing: 2, opacity: 0.4, marginTop: 6, marginLeft: 8 }}>⚠ MANCER ⚠</div>}
              <div style={{ fontFamily: "'Courier Prime', monospace", fontSize: 9, color: "#8b7355", letterSpacing: 2, marginTop: 6 }}>CASE NO. {caseNo}</div>
            </div>

            <div style={styles.printSection}><div style={styles.printSectionTitle}>IDENTIFICATION</div>
              <div style={styles.printRow}><span><strong>Background:</strong> {char.background}</span><span><strong>Languages:</strong> {Array.isArray(char.languages) ? char.languages.join(", ") : char.languages}</span></div>
              <div style={styles.printRow}><span><strong>Primary:</strong> {char.primary_attr}</span><span><strong>Secondary:</strong> {char.secondary_attr}</span></div>
              <div style={styles.printRow}><span><strong>CP:</strong> {3+char.level*3+flawsCpGained} total, {char.cp_spent+meritsCpSpent} spent, {(3+char.level*3+flawsCpGained)-(char.cp_spent+meritsCpSpent)} remaining</span><span><strong>SP:</strong> {spTotal} total, {spSpent} spent, {spTotal-spSpent} remaining</span></div>
            </div>

            <div style={styles.printSection}><div style={styles.printSectionTitle}>ATTRIBUTES</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {ATTR_LIST.map(a => <div key={a} style={styles.printStatBox}><strong>{a}{char.primary_attr===a?" ★":char.secondary_attr===a?" ☆":""}</strong><div style={{ fontSize: 20, fontWeight: 700 }}>{char.attrs[a]}</div><div style={{ color: "#8b7355" }}>{fmtMod(getModifier(char.attrs[a]))}</div></div>)}
              </div>
            </div>

            <div style={styles.printSection}><div style={styles.printSectionTitle}>COMBAT & VITALS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {[["HP",`${char.hp_current}/${char.hp_max}`],["EVA",eva],["INIT",fmtMod(initiative+(char.init_bonus||0))],["MOV",`${char.movement}ft`],["REC",char.recovery_die],["FTG",`${char.fatigue||0}/5`]].map(([l,v]) => <div key={l} style={styles.printStatBox}><strong>{l}</strong><div style={{ fontSize: 18, fontWeight: 700 }}>{v}</div></div>)}
              </div>
              {char.mana_enabled && <div style={{ fontSize: 11, marginTop: 4 }}>MANA: {char.mana_current||0} / {manaMax}</div>}
              {char.pe_enabled && <div style={{ fontSize: 11 }}>PE: {char.pe_current||0} / {peMax}</div>}
            </div>

            <div style={styles.printSection}><div style={styles.printSectionTitle}>SANITY</div>
              <div style={{ fontSize: 12 }}>{char.sanity_current} / {sanMax}</div>
              {SANITY_TYPES.map(t => <div key={t} style={{ fontSize: 11 }}>{t}: DC {char.sanity_dcs[t]}</div>)}
            </div>

            <div style={styles.printSection}><div style={styles.printSectionTitle}>SKILLS</div>
              {ATTR_LIST.flatMap(attr => {
                const mod = getModifier(char.attrs[attr]);
                return SKILL_MAP[attr].flatMap(skill => {
                  if (skill==="Knowledge") return (char.knowledge_types||[]).map(t => ({name:`K: ${t}`,key:`Knowledge_-_${t.replace(/\s/g,"_")}`,attr,mod}));
                  if (skill==="Craft") return (char.craft_types||[]).map(t => ({name:`C: ${t}`,key:`Craft_-_${t.replace(/\s/g,"_")}`,attr,mod}));
                  return [{name:skill,key:skill.replace(/\s/g,"_"),attr,mod}];
                });
              }).filter(s => ((char.trained_skills||{})[s.key]||0)>0 || trainedList.includes(s.key)).map(s => {
                const ranks = (char.trained_skills||{})[s.key]||0;
                return <div key={s.key} style={{ fontSize: 11, display: "flex", gap: 16 }}><span style={{ width: 150 }}>{trainedList.includes(s.key)?"◆":"◇"} {s.name}</span><span>{s.attr}</span><span>Ranks: {ranks}</span><span>Total: {fmtMod(ranks+s.mod)}</span></div>;
              })}
            </div>

            {((char.merits||[]).length > 0 || (char.flaws||[]).length > 0) && <div style={styles.printSection}><div style={styles.printSectionTitle}>MERITS & FLAWS</div>
              {(char.merits||[]).map(m => <div key={m.id} style={{ fontSize: 11 }}><span style={{ color: "#8b2500", fontWeight: 700 }}>-{m.cost}</span> <strong>{m.name}</strong>{m.desc ? ` — ${m.desc}` : ""}</div>)}
              {(char.flaws||[]).map(f => <div key={f.id} style={{ fontSize: 11 }}><span style={{ color: "#8b6914", fontWeight: 700 }}>+{f.cost}</span> <strong>{f.name}</strong>{f.desc ? ` — ${f.desc}` : ""}</div>)}
            </div>}

            {((char.ability_list||[]).length > 0 || char.abilities) && <div style={styles.printSection}><div style={styles.printSectionTitle}>ABILITIES</div>
              {(char.ability_list||[]).map(a => <div key={a.id} style={{ fontSize: 11, marginBottom: 4 }}><strong>{a.name||"—"}</strong>{a.cost ? ` (${a.cost} CP)` : ""}{a.desc ? ` — ${a.desc}` : ""}</div>)}
              {char.abilities && <div style={{ fontSize: 11, whiteSpace: "pre-wrap", marginTop: 6, opacity: 0.7 }}>{char.abilities}</div>}
            </div>}

            {((char.weapons||[]).length > 0 || (char.armor||[]).length > 0) && <div style={styles.printSection}><div style={styles.printSectionTitle}>WEAPONS & ARMOR</div>
              {(char.weapons||[]).map(w => <div key={w.id} style={{ fontSize: 11, marginBottom: 4 }}><strong>{w.name||"—"}</strong> ATK:{w.atk_bonus} Dmg:{w.damage} {w.crit} | {w.type} | {w.range}{Array.isArray(w.properties)&&w.properties.length?` [${w.properties.join(", ")}]`:""}</div>)}
              {(char.armor||[]).map(a => <div key={a.id} style={{ fontSize: 11, marginBottom: 4 }}><strong>{a.name||"—"}</strong> [{a.type}] DR:{a.resistance}{a.penalty?` | ${a.penalty}`:""}{Array.isArray(a.properties)&&a.properties.length?` [${a.properties.join(", ")}]`:""}</div>)}
            </div>}

            {(char.spellbook||[]).length > 0 && <div style={styles.printSection}><div style={styles.printSectionTitle}>SPELLBOOK</div>
              {(char.spellbook||[]).map(s => <div key={s.id} style={{ fontSize: 11, marginBottom: 4 }}><strong>{s.name||"—"}</strong> {s.kind==="spell"?`[${s.domain} T${s.tier}] ${s.cost} Mana | ${s.save} | ${s.range}`:`[${s.mancy_type} Lv${s.level}] PE:${s.pe_cost}`}{s.desc?` — ${s.desc}`:""}</div>)}
            </div>}

            {char.notes && <div style={styles.printSection}><div style={styles.printSectionTitle}>FIELD NOTES</div><div style={{ fontSize: 11, whiteSpace: "pre-wrap" }}>{char.notes}</div></div>}

            <div style={{ textAlign: "center", fontFamily: "'Special Elite', cursive", fontSize: 8, letterSpacing: 4, color: "#8b7355", marginTop: 32, borderTop: "1px solid #c8bfb0", paddingTop: 12 }}>
              {firmName} — {caseNo} — CLASSIFIED
            </div>
          </div>
        </div>
      )}

      {/* COMBAT REFERENCE OVERLAY */}
      {combatRefOpen && (
        <div style={styles.journalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setCombatRefOpen(false); }}>
          <div style={styles.journalPage}>
            <div style={styles.jpHoles}>
              {[...Array(12)].map((_, i) => <div key={i} style={styles.jpHole}/>)}
            </div>
            <div style={styles.jpRedLine}/>
            <div style={styles.jpContent}>
              <div style={styles.jpHeader}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style={{ margin: "0 auto 8px" }}>
                  <circle cx="12" cy="12" r="9" stroke="#4a3c2a" strokeWidth="1.5" fill="none"/>
                  <path d="M12 7v5l3 3" stroke="#8b6914" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M7 3L5 5M17 3l2 2" stroke="#4a3c2a" strokeWidth="1" strokeLinecap="round"/>
                </svg>
                <div style={styles.jpLogo}>COMBAT REFERENCE</div>
                <div style={styles.jpLogoSub}>FIELD OPERATIONS MANUAL</div>
                <div style={styles.jpDivider}/>
              </div>

              <div style={{ maxHeight: "65vh", overflowY: "auto" }}>
                {Object.entries(COMBAT_REF).map(([category, entries]) => (
                  <div key={category} style={{ marginBottom: 16 }}>
                    <div style={styles.combatRefCat}>{category.toUpperCase()}</div>
                    {entries.map(entry => (
                      <div key={entry.name} style={styles.combatRefEntry}>
                        <div style={styles.combatRefName}>{entry.name}</div>
                        <div style={styles.combatRefDesc}>{entry.desc}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div style={styles.jpFooter}>
                {firmName} — FIELD OPERATIONS — RESTRICTED
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EQUIPMENT OVERLAY */}
      {equipmentOpen && (
        <div style={styles.journalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setEquipmentOpen(false); }}>
          <div style={{ ...styles.journalPage, maxWidth: 800 }}>
            <div style={styles.jpHoles}>{[...Array(12)].map((_, i) => <div key={i} style={styles.jpHole}/>)}</div>
            <div style={styles.jpRedLine}/>
            <div style={styles.jpContent}>
              <div style={styles.jpHeader}>
                <div style={styles.jpLogo}>EQUIPMENT MANIFEST</div>
                <div style={styles.jpLogoSub}>{char.name}</div>
                <div style={styles.jpDivider}/>
              </div>

              <div style={{ maxHeight: "65vh", overflowY: "auto" }}>
                {/* WEAPONS */}
                <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 11, letterSpacing: 4, color: "#4a3c2a", borderBottom: "1px solid #c8bfb0", paddingBottom: 3, marginBottom: 10 }}>WEAPONS</div>
                {(char.weapons || []).map(w => {
                  const cap = parseInt(w.capacity) || 0;
                  const cur = parseInt(w.ammo_current ?? w.capacity) || 0;
                  return (
                    <div key={w.id} style={{ background: "#f0eadd", border: "1px solid #c8bfb0", borderRadius: 3, padding: 12, marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <input type="text" value={w.name} onChange={(e) => updateWeapon(w.id, "name", e.target.value)} placeholder="Weapon name..."
                          style={{ flex: 1, background: "transparent", border: "none", borderBottom: "1px solid #c8bfb044", fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: "#2a2118", padding: "2px 0", outline: "none" }}/>
                        <button onClick={() => removeWeapon(w.id)} style={{ background: "transparent", border: "1px solid #8b250033", borderRadius: 2, color: "#8b2500", cursor: "pointer", fontSize: 10, padding: "2px 6px", opacity: 0.5 }}>✕</button>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                        {[["ATK",w.atk_bonus,"atk_bonus","+3"],["Dmg",w.damage,"damage","1d10"],["Crit",w.crit,"crit","x2"],["Type",w.type,"type","P/S/B"],["Range",w.range,"range","60ft"],["Ammo",w.ammo,"ammo",".45"],["Wt",w.weight,"weight","3lb"]].map(([l,v,k,ph]) => (
                          <div key={k} style={{ minWidth: 50 }}>
                            <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 8, color: "#8b7355", letterSpacing: 1 }}>{l}</div>
                            <input type="text" value={v||""} onChange={(e) => updateWeapon(w.id, k, e.target.value)} placeholder={ph}
                              style={{ width: "100%", background: "transparent", border: "none", borderBottom: "1px solid #c8bfb044", fontFamily: "'Courier Prime', monospace", fontSize: 11, color: "#2a2118", padding: "2px 0", outline: "none" }}/>
                          </div>
                        ))}
                        <div style={{ minWidth: 50 }}>
                          <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 8, color: "#8b7355", letterSpacing: 1 }}>Cap</div>
                          <input type="text" value={w.capacity||""} onChange={(e) => updateWeapon(w.id, "capacity", e.target.value)} placeholder="8"
                            style={{ width: 40, background: "transparent", border: "none", borderBottom: "1px solid #c8bfb044", fontFamily: "'Courier Prime', monospace", fontSize: 11, color: "#2a2118", padding: "2px 0", outline: "none", textAlign: "center" }}/>
                        </div>
                      </div>
                      {/* Bullet ammo tracker */}
                      {cap > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
                            {[...Array(Math.min(cap, 30))].map((_, i) => {
                              const bulletNum = i + 1;
                              const loaded = bulletNum <= cur;
                              return (
                                <svg key={i} width="10" height="22" viewBox="0 0 10 22" style={{ cursor: "pointer", opacity: loaded ? 1 : 0.25 }}
                                  onClick={() => updateWeapon(w.id, "ammo_current", loaded ? i : bulletNum)}>
                                  <rect x="2" y="8" width="6" height="12" rx="1" fill={loaded ? "#8b6914" : "#c8bfb0"} stroke={loaded ? "#4a3c2a" : "#c8bfb0"} strokeWidth="0.5"/>
                                  <path d="M3 8 L5 2 L7 8" fill={loaded ? "#c4a46c" : "#c8bfb0"} stroke={loaded ? "#4a3c2a" : "#c8bfb0"} strokeWidth="0.5"/>
                                </svg>
                              );
                            })}
                            {cap > 30 && <span style={{ fontFamily: "'Courier Prime', monospace", fontSize: 10, color: "#8b7355", marginLeft: 4 }}>{cur}/{cap}</span>}
                            <button onClick={() => updateWeapon(w.id, "ammo_current", cap)} title="Reload"
                              style={{ marginLeft: 6, background: "transparent", border: "1px solid #c8bfb0", borderRadius: 2, color: "#8b7355", cursor: "pointer", fontSize: 9, padding: "2px 6px", fontFamily: "'Special Elite', cursive" }}>⟲</button>
                          </div>
                        </div>
                      )}
                      <div style={{ marginTop: 4 }}>
                        <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 8, color: "#8b7355", letterSpacing: 1, marginBottom: 2 }}>Properties</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                          {(Array.isArray(w.properties) ? w.properties : []).map(p => {
                            const def = ALL_WEAPON_PROPS.find(wp => wp.name === p);
                            return <PropTag key={p} name={p} desc={def ? def.desc : ""} onRemove={() => toggleWeaponProp(w.id, p)}/>;
                          })}
                        </div>
                        <PropPicker options={ALL_WEAPON_PROPS} active={Array.isArray(w.properties) ? w.properties : []} onToggle={(name) => toggleWeaponProp(w.id, name)} type="weapon"/>
                      </div>
                    </div>
                  );
                })}
                <button onClick={addWeapon} style={styles.spellAddBtn}>+ Add Weapon</button>

                {/* ARMOR */}
                <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 11, letterSpacing: 4, color: "#4a3c2a", borderBottom: "1px solid #c8bfb0", paddingBottom: 3, marginBottom: 10, marginTop: 20 }}>ARMOR</div>
                {(char.armor || []).map(a => (
                  <div key={a.id} style={{ background: "#f0eadd", border: "1px solid #c8bfb0", borderRadius: 3, padding: 12, marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <input type="text" value={a.name} onChange={(e) => updateArmor(a.id, "name", e.target.value)} placeholder="Armor name..."
                        style={{ flex: 1, background: "transparent", border: "none", borderBottom: "1px solid #c8bfb044", fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: "#2a2118", padding: "2px 0", outline: "none" }}/>
                      <select value={a.type} onChange={(e) => updateArmor(a.id, "type", e.target.value)} style={{ background: "#f4efe6", border: "1px solid #c8bfb0", borderRadius: 2, fontFamily: "'Courier Prime', monospace", fontSize: 10, color: "#2a2118", padding: "2px 4px" }}>
                        <option value="L">Light</option><option value="M">Medium</option><option value="H">Heavy</option>
                      </select>
                      <button onClick={() => removeArmor(a.id)} style={{ background: "transparent", border: "1px solid #8b250033", borderRadius: 2, color: "#8b2500", cursor: "pointer", fontSize: 10, padding: "2px 6px", opacity: 0.5 }}>✕</button>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                      {[["DR",a.resistance,"resistance","DR 2: S, P"],["Penalty",a.penalty,"penalty","-5ft mov"],["Mod 1",a.mod1,"mod1","Upgrade"],["Mod 2",a.mod2,"mod2","Upgrade"]].map(([l,v,k,ph]) => (
                        <div key={k} style={{ flex: 1, minWidth: 80 }}>
                          <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 8, color: "#8b7355", letterSpacing: 1 }}>{l}</div>
                          <input type="text" value={v||""} onChange={(e) => updateArmor(a.id, k, e.target.value)} placeholder={ph}
                            style={{ width: "100%", background: "transparent", border: "none", borderBottom: "1px solid #c8bfb044", fontFamily: "'Courier Prime', monospace", fontSize: 11, color: "#2a2118", padding: "2px 0", outline: "none" }}/>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 8, color: "#8b7355", letterSpacing: 1, marginBottom: 2 }}>Properties</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                        {(Array.isArray(a.properties) ? a.properties : []).map(p => {
                          const def = ALL_ARMOR_PROPS.find(ap => ap.name === p);
                          return <PropTag key={p} name={p} desc={def ? def.desc : ""} onRemove={() => toggleArmorProp(a.id, p)}/>;
                        })}
                      </div>
                      <PropPicker options={ALL_ARMOR_PROPS} active={Array.isArray(a.properties) ? a.properties : []} onToggle={(name) => toggleArmorProp(a.id, name)} type="armor"/>
                    </div>
                  </div>
                ))}
                <button onClick={addArmor} style={styles.spellAddBtn}>+ Add Armor</button>

                {/* OTHER EQUIPMENT */}
                <div style={{ fontFamily: "'Special Elite', cursive", fontSize: 11, letterSpacing: 4, color: "#4a3c2a", borderBottom: "1px solid #c8bfb0", paddingBottom: 3, marginBottom: 10, marginTop: 20 }}>OTHER EQUIPMENT</div>
                <textarea value={char.equipment || ""} onChange={(e) => updateChar("equipment", e.target.value)}
                  style={{ width: "100%", background: "#f4efe622", border: "1px solid #c8bfb0", borderRadius: 2, color: "#3a3025", fontFamily: "'Courier Prime', monospace", fontSize: 11, padding: "8px", outline: "none", resize: "vertical", lineHeight: 1.6 }}
                  rows={4} placeholder="Other gear, tools, misc items..."/>
              </div>

              <div style={styles.jpFooter}>{firmName} — EQUIPMENT REGISTRY — RESTRICTED</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, expanded, toggle, icon, draggable }) {
  return (
    <div style={styles.sectionHeaderWrap}>
      {draggable && <span style={styles.dragGrip} title="Drag to reorder">⠿</span>}
      <button onClick={toggle} style={styles.sectionHeader}>
        <span style={styles.sectionIcon}>{icon}</span>
        <span style={styles.sectionTitle}>{title}</span>
        <span style={styles.sectionArrow}>{expanded ? "▾" : "▸"}</span>
        <span style={styles.sectionLine}/>
      </button>
    </div>
  );
}

function KnowledgeAdder({ onAdd }) {
  const [val, setVal] = useState("");
  const COMMON = ["Accounting","Anthropology","Archaeology","Architecture","Art","Astronomy","Biology","Chemistry","Electronics","Engineering","Geography","Geology","History","Law","Local","Marine Biology","Mathematics","Medicine","Meteorology","Philosophy","Physics","Psychology","Religion","Science","Soul","Streetwise"];
  return (
    <div style={styles.knowledgeAdder}>
      <select value="" onChange={(e) => { if (e.target.value) { onAdd(e.target.value); e.target.value = ""; } }} style={styles.knowledgeSelect}>
        <option value="">+ Add Knowledge...</option>
        {COMMON.map(k => <option key={k} value={k}>{k}</option>)}
      </select>
      <div style={styles.knowledgeCustomRow}>
        <input type="text" value={val} onChange={(e) => setVal(e.target.value)} placeholder="Custom type..."
          style={styles.knowledgeCustomInput} onKeyDown={(e) => { if (e.key === "Enter" && val.trim()) { onAdd(val); setVal(""); } }}/>
        <button onClick={() => { if (val.trim()) { onAdd(val); setVal(""); } }} style={styles.knowledgeCustomBtn}>+</button>
      </div>
    </div>
  );
}

function CraftAdder({ onAdd }) {
  const [val, setVal] = useState("");
  const COMMON = ["Weapons","Armor","Foodstuffs","Metalwork","Woodwork","Leatherwork","Textiles","Jewelry","Pottery","Glasswork","Alchemy","Gunsmithing","Explosives","Clockwork"];
  return (
    <div style={styles.knowledgeAdder}>
      <select value="" onChange={(e) => { if (e.target.value) { onAdd(e.target.value); e.target.value = ""; } }} style={styles.knowledgeSelect}>
        <option value="">+ Add Craft...</option>
        {COMMON.map(k => <option key={k} value={k}>{k}</option>)}
      </select>
      <div style={styles.knowledgeCustomRow}>
        <input type="text" value={val} onChange={(e) => setVal(e.target.value)} placeholder="Custom craft..."
          style={styles.knowledgeCustomInput} onKeyDown={(e) => { if (e.key === "Enter" && val.trim()) { onAdd(val); setVal(""); } }}/>
        <button onClick={() => { if (val.trim()) { onAdd(val); setVal(""); } }} style={styles.knowledgeCustomBtn}>+</button>
      </div>
    </div>
  );
}

function Tooltip({ text, children }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-block" }} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && text && (
        <div style={styles.statTooltip}>{text}</div>
      )}
    </span>
  );
}

function PropTag({ name, desc, onRemove }) {
  const [hover, setHover] = useState(false);
  const tagRef = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const handleEnter = () => {
    if (tagRef.current) {
      const r = tagRef.current.getBoundingClientRect();
      setPos({ x: r.left + r.width / 2, y: r.top });
    }
    setHover(true);
  };
  return (
    <span ref={tagRef} style={styles.propTag} onMouseEnter={handleEnter} onMouseLeave={() => setHover(false)}>
      {name}
      <span onClick={onRemove} style={styles.propTagX}>✕</span>
      {hover && desc && (
        <div style={{ ...styles.propTooltip, position: "fixed", bottom: "auto", left: pos.x, top: pos.y - 8, transform: "translate(-50%, -100%)" }}>{desc}</div>
      )}
    </span>
  );
}

function LanguagePicker({ active, onToggle }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 4 }}>
      <button onClick={() => setOpen(!open)} style={styles.propPickerBtn}>{open ? "− Hide Languages" : `+ Select Languages (${active.length})`}</button>
      {open && (
        <div style={styles.propPickerDrop}>
          {Object.entries(LANGUAGES).map(([cat, langs]) => (
            <div key={cat}>
              <div style={styles.propPickerCat}>{cat}</div>
              <div style={styles.propPickerGrid}>
                {langs.map(lang => {
                  const isActive = active.includes(lang);
                  return <button key={lang} onClick={() => onToggle(lang)} style={{ ...styles.propPickerItem, ...(isActive ? styles.propPickerItemActive : {}) }}>{isActive ? "✓ " : ""}{lang}</button>;
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PropPicker({ options, active, onToggle, type }) {
  const [open, setOpen] = useState(false);
  const grouped = type === "weapon";
  return (
    <div style={{ position: "relative", marginTop: 4 }}>
      <button onClick={() => setOpen(!open)} style={styles.propPickerBtn}>{open ? "− Close" : "+ Add Property"}</button>
      {open && (
        <div style={styles.propPickerDrop}>
          {grouped ? Object.entries(WEAPON_PROPS).map(([cat, props]) => (
            <div key={cat}>
              <div style={styles.propPickerCat}>{cat}</div>
              <div style={styles.propPickerGrid}>
                {Object.entries(props).map(([name, desc]) => {
                  const isActive = active.includes(name);
                  return (
                    <button key={name} onClick={() => onToggle(name)}
                      style={{ ...styles.propPickerItem, ...(isActive ? styles.propPickerItemActive : {}) }}
                      title={desc}>
                      {isActive ? "✓ " : ""}{name}
                    </button>
                  );
                })}
              </div>
            </div>
          )) : (
            <div style={styles.propPickerGrid}>
              {options.map(({ name, desc }) => {
                const isActive = active.includes(name);
                return (
                  <button key={name} onClick={() => onToggle(name)}
                    style={{ ...styles.propPickerItem, ...(isActive ? styles.propPickerItemActive : {}) }}
                    title={desc}>
                    {isActive ? "✓ " : ""}{name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EditableField({ label, value, onChange, type = "text", placeholder, half, quarter, small }) {
  const isDisplay = type === "display";
  const wrapStyle = quarter ? { flex: "0 0 24%", minWidth: 70 } : half ? { flex: "0 0 48%", minWidth: 120 } : { flex: 1, minWidth: 140 };
  return (
    <div style={{ ...wrapStyle, marginBottom: small ? 4 : 10 }}>
      <label style={{ ...styles.fieldLabel, fontSize: small ? 9 : 10 }}>{label}</label>
      {isDisplay ? (
        <div style={styles.displayValue}>{value}</div>
      ) : (
        <input type={type === "number" ? "number" : "text"} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} style={{ ...styles.textInput, fontSize: small ? 11 : 13 }}/>
      )}
    </div>
  );
}

function CheckboxField({ label, checked, onChange }) {
  return (
    <label style={styles.checkboxWrap}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ display: "none" }}/>
      <span style={{ ...styles.checkboxBox, ...(checked ? styles.checkboxChecked : {}) }}>
        {checked && "✕"}
      </span>
      <span style={styles.checkboxLabel}>{label}</span>
    </label>
  );
}

function StatBox({ label, sub, children, tip }) {
  return (
    <div style={styles.statBox}>
      <Tooltip text={tip}>
        <div style={{ ...styles.statLabel, cursor: tip ? "help" : "default" }}>{label}</div>
      </Tooltip>
      <div style={styles.statSub}>{sub}</div>
      {children}
    </div>
  );
}

function HpBar({ current, max, color = "#8b2500" }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  const barColor = color === "#8b2500"
    ? pct > 60 ? "#4a7a3a" : pct > 30 ? "#8b6914" : "#8b2500"
    : pct > 60 ? "#8b6914" : pct > 30 ? "#8b4513" : "#8b2500";
  return (
    <div style={styles.hpBarOuter}>
      <div style={{ ...styles.hpBarInner, width: `${pct}%`, background: barColor }}/>
    </div>
  );
}

let styles = {};
function getStyles(T) { return {
  container: {
    fontFamily: "'Courier Prime', 'Courier New', monospace",
    background: T.bg,
    minHeight: "100vh",
    color: T.text,
    position: "relative",
  },
  loadingScreen: {
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    minHeight: "100vh", background: T.bg, color: T.accent,
  },
  loadingLogo: { fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 900, letterSpacing: 3, marginBottom: 20 },
  loadingText: { fontFamily: "'Special Elite', cursive", fontSize: 14, letterSpacing: 4, opacity: 0.6, animation: "pulse 2s infinite" },

  // Header
  header: { background: T.headerBg, borderBottom: `2px solid ${T.accentDark}`, position: "sticky", top: 0, zIndex: 100, overflow: "hidden" },
  headerInner: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px 8px", flexWrap: "wrap", gap: 12, position: "relative", zIndex: 2 },
  logoBlock: { display: "flex", alignItems: "center" },
  logoText: { fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 900, color: T.accent, letterSpacing: 4, lineHeight: 1 },
  logoAmp: { color: T.accentDim, fontWeight: 700 },
  logoSub: { fontFamily: "'Special Elite', cursive", fontSize: 9, letterSpacing: 5, color: T.accentDim, marginTop: 3 },
  headerRight: { display: "flex", alignItems: "center", gap: 16 },
  classifiedStamp: {
    fontFamily: "'Special Elite', cursive", fontSize: 14, color: T.stamp, border: `2px solid ${T.stamp}`,
    padding: "2px 12px", transform: "rotate(-3deg)", fontWeight: 700, letterSpacing: 3, opacity: 0.8,
  },
  saveIndicator: { fontFamily: "'Courier Prime', monospace", fontSize: 10, color: T.accentDim, letterSpacing: 2 },
  themeBtn: {
    background: "transparent", border: `1px solid ${T.accentDark}`, borderRadius: 2,
    padding: "2px 8px", cursor: "pointer", outline: "none",
    fontFamily: "'Special Elite', cursive", fontSize: 8, color: T.accentDim,
    letterSpacing: 1, display: "flex", alignItems: "center", opacity: 0.5,
    transition: "all 0.2s",
  },
  themeBtnActive: { opacity: 1, borderColor: T.accent, color: T.accent },
  headerBar: { background: T.accent, padding: "3px 24px", overflow: "hidden", position: "relative", zIndex: 2 },
  headerBarText: { fontFamily: "'Courier Prime', monospace", fontSize: 9, color: T.bg, letterSpacing: 4, fontWeight: 700 },

  // Tabs
  tabRow: { display: "flex", gap: 2, padding: "0 20px", background: T.bgAlt, alignItems: "flex-end" },
  tab: {
    flex: 1, background: T.tabBg,
    border: `1px solid ${T.tabBorder}`, borderBottom: "none",
    borderRadius: "4px 4px 0 0", padding: "10px 14px", cursor: "pointer",
    fontFamily: "'Special Elite', cursive", color: T.tabText, textAlign: "left",
    transition: "all 0.25s ease", position: "relative", outline: "none",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), 0 -1px 3px rgba(0,0,0,0.2)",
  },
  tabActive: {
    background: T.tabActive,
    color: T.accent, borderColor: T.accent,
    boxShadow: `inset 0 2px 0 ${T.accent}, inset 0 1px 0 rgba(255,255,255,0.2), 0 -2px 8px ${T.accent}18`,
  },
  tabLabel: { display: "block", fontSize: 8, letterSpacing: 3, opacity: 0.5, marginBottom: 2 },
  tabName: { display: "block", fontSize: 13, letterSpacing: 1, lineHeight: 1.3 },
  tabRace: { display: "block", fontSize: 9, opacity: 0.45, marginTop: 2 },
  tabClose: {
    position: "absolute", top: 5, right: 5, width: 16, height: 16,
    background: "transparent", border: `1px solid ${T.accentDim}44`, borderRadius: 2,
    color: T.accentDark, cursor: "pointer", fontSize: 9, display: "flex",
    alignItems: "center", justifyContent: "center", outline: "none",
    padding: 0, lineHeight: 1, opacity: 0.4, transition: "all 0.2s",
    zIndex: 2,
  },
  tabCloseConfirm: {
    opacity: 1, background: T.stamp, borderColor: T.stamp, color: T.pageBg,
  },
  addTab: {
    width: 32, background: T.tabBg,
    border: `1px solid ${T.tabBorder}`, borderBottom: "none", borderRadius: "4px 4px 0 0",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", color: T.tabText, fontSize: 18, fontWeight: 700,
    fontFamily: "'Courier Prime', monospace", opacity: 0.6,
    transition: "opacity 0.2s", flexShrink: 0, alignSelf: "flex-end",
    padding: "8px 0",
  },

  // Dossier
  dossierWrap: { padding: "0 20px 40px" },
  dossierPage: {
    background: T.bgCard,
    border: `1px solid ${T.accentDark}`, borderTop: "none", borderRadius: "0 0 4px 4px",
    padding: "24px 28px", position: "relative", overflow: "hidden",
    boxShadow: "0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)",
  },
  cornerTL: {
    position: "absolute", top: 0, left: 0, width: 60, height: 60,
    borderRight: `1px solid ${T.accentDark}33`, borderBottom: `1px solid ${T.accentDark}33`,
  },
  cornerBR: {
    position: "absolute", bottom: 0, right: 0, width: 60, height: 60,
    borderLeft: `1px solid ${T.accentDark}33`, borderTop: `1px solid ${T.accentDark}33`,
  },
  caseNumber: {
    position: "absolute", top: 10, left: 28, fontFamily: "'Courier Prime', monospace",
    fontSize: 9, color: T.accentDark, letterSpacing: 2, opacity: 0.4, zIndex: 1,
  },
  soulBoundStamp: {
    position: "absolute", top: 30, right: 30, fontFamily: "'Special Elite', cursive",
    fontSize: 20, color: T.stamp, border: `3px solid ${T.stamp}`, padding: "4px 16px",
    transform: "rotate(-5deg)", fontWeight: 700, letterSpacing: 4, opacity: 0.5,
    animation: "stampIn 0.5s ease-out",
  },
  mancerStamp: {
    position: "absolute", top: 72, right: 20, fontFamily: "'Special Elite', cursive",
    fontSize: 11, color: T.accent, background: `${T.stamp}88`, padding: "3px 10px",
    transform: "rotate(-3deg)", letterSpacing: 2, opacity: 0.7, borderRadius: 2,
  },

  // Draggable Sections
  draggableSection: {
    transition: "all 0.25s ease", borderRadius: 3, position: "relative", zIndex: 1,
  },
  dragOverSection: {
    borderTop: `2px solid ${T.accent}`, paddingTop: 4,
    background: "linear-gradient(180deg, rgba(196,164,108,0.04) 0%, transparent 40px)",
  },
  draggingSection: {
    opacity: 0.35, transform: "scale(0.98)",
  },

  // Section Headers
  sectionHeaderWrap: {
    display: "flex", alignItems: "center", gap: 0,
  },
  dragGrip: {
    color: T.accentDark, fontSize: 16, cursor: "grab", padding: "8px 8px 8px 0",
    userSelect: "none", lineHeight: 1, flexShrink: 0, opacity: 0.3,
    transition: "opacity 0.3s, color 0.3s",
  },
  sectionHeader: {
    display: "flex", alignItems: "center", gap: 10, width: "100%",
    background: "none", border: "none", cursor: "pointer", padding: "16px 0 8px",
    color: T.accent, outline: "none", transition: "all 0.2s",
  },
  sectionIcon: { fontSize: 8, color: T.accentDim },
  sectionTitle: { fontFamily: "'Special Elite', cursive", fontSize: 14, letterSpacing: 4, whiteSpace: "nowrap" },
  sectionArrow: { fontSize: 12, color: T.accentDim, width: 16 },
  sectionLine: { flex: 1, height: 1, background: `linear-gradient(90deg, ${T.accentDark}, transparent)`, marginLeft: 8 },
  sectionContent: { paddingLeft: 18, paddingBottom: 12, borderLeft: `1px solid ${T.accentDark}15`, marginLeft: 3 },

  // Identity
  identityGrid: { display: "flex", gap: 24, flexWrap: "wrap" },
  photoArea: { flex: "0 0 140px" },
  photoFrame: {
    width: 140, height: 180, border: `2px solid ${T.accentDark}`, background: T.bg,
    display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
    boxShadow: "inset 0 0 20px rgba(0,0,0,0.5), 3px 3px 8px rgba(0,0,0,0.3)",
    position: "relative",
  },
  photoImg: { width: "100%", height: "100%", objectFit: "cover", filter: "sepia(20%) contrast(110%) brightness(0.95)" },
  photoPlaceholder: {
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    color: T.accentDark, fontFamily: "'Special Elite', cursive",
  },
  photoUploadBtn: {
    background: "linear-gradient(180deg, #1a1410 0%, #151210 100%)", border: `1px solid ${T.accentDark}`,
    borderRadius: 2, padding: "4px 8px", cursor: "pointer",
    fontFamily: "'Special Elite', cursive", fontSize: 9, color: T.accent,
    letterSpacing: 1, flexShrink: 0, textAlign: "center",
    transition: "all 0.2s",
  },
  identityFields: { flex: 1, minWidth: 280 },

  // Fields
  fieldRow: { display: "flex", gap: 12, flexWrap: "wrap" },
  fieldLabel: {
    display: "block", fontFamily: "'Special Elite', cursive", fontSize: 10,
    color: T.accentDim, letterSpacing: 2, marginBottom: 3, textTransform: "uppercase",
  },
  textInput: {
    width: "100%", background: "transparent", border: "none", borderBottom: `1px solid ${T.accentDark}`,
    color: T.text, fontFamily: "'Courier Prime', monospace", fontSize: 13,
    padding: "4px 2px", outline: "none", transition: "border-color 0.2s",
  },
  textArea: {
    width: "100%", background: T.bgInput, border: `1px solid ${T.accentDark}`, borderRadius: 2,
    color: T.text, fontFamily: "'Courier Prime', monospace", fontSize: 12,
    padding: "8px", outline: "none", resize: "vertical", lineHeight: 1.6,
  },
  displayValue: {
    fontFamily: "'Courier Prime', monospace", fontSize: 15, color: T.accent,
    padding: "4px 2px", borderBottom: `1px solid ${T.accentDark}33`, fontWeight: 700,
  },
  selectInput: {
    width: "100%", background: T.bg, border: `1px solid ${T.accentDark}`, borderRadius: 2,
    color: T.text, fontFamily: "'Courier Prime', monospace", fontSize: 11,
    padding: "4px 6px", outline: "none", marginBottom: 8,
  },
  textarea: {
    width: "100%", background: "#1a141066", border: `1px solid ${T.accentDark}`, borderRadius: 2,
    color: T.text, fontFamily: "'Courier Prime', monospace", fontSize: 12,
    padding: "8px 10px", outline: "none", resize: "vertical", lineHeight: 1.6,
  },
  checkboxWrap: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "6px 0", flex: "0 0 48%", minWidth: 120 },
  checkboxBox: {
    width: 18, height: 18, border: `1px solid ${T.accentDark}`, display: "flex",
    alignItems: "center", justifyContent: "center", fontSize: 12, color: T.stamp,
    fontWeight: 700, background: T.bg, flexShrink: 0,
  },
  checkboxChecked: { borderColor: T.stamp, background: `${T.stamp}22` },
  checkboxLabel: { fontFamily: "'Special Elite', cursive", fontSize: 11, color: T.accentDim, letterSpacing: 1 },

  // Attributes
  attrGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 12 },
  attrCard: {
    background: "linear-gradient(180deg, #1a1410 0%, #171210 100%)", border: `1px solid ${T.accentDark}`, borderRadius: 3,
    padding: "14px 12px", textAlign: "center", position: "relative",
    transition: "border-color 0.3s, box-shadow 0.3s",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
  },
  attrPrimary: { borderColor: T.accent, boxShadow: `0 2px 6px rgba(0,0,0,0.2), 0 0 12px ${T.accent}15` },
  attrSecondary: { borderColor: T.accentDim, boxShadow: `0 2px 6px rgba(0,0,0,0.2), 0 0 12px ${T.accentDim}15` },
  attrBadge: {
    position: "absolute", top: 4, right: 6, fontSize: 8, fontFamily: "'Special Elite', cursive",
    color: T.accent, letterSpacing: 2, opacity: 0.7,
  },
  attrName: { fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 900, color: T.accent, letterSpacing: 2 },
  attrFull: { fontSize: 8, letterSpacing: 2, color: T.accentDim, marginBottom: 10, textTransform: "uppercase" },
  attrScoreInput: {
    width: 56, background: "transparent", border: "none", borderBottom: `2px solid ${T.accentDark}`,
    color: T.text, fontFamily: "'Courier Prime', monospace", fontSize: 28,
    textAlign: "center", outline: "none", fontWeight: 700,
  },
  attrMod: {
    fontFamily: "'Courier Prime', monospace", fontSize: 16, color: T.accentDim,
    marginTop: 6, fontWeight: 700,
  },
  attrCapRow: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
    marginTop: 6, borderTop: `1px solid ${T.accentDark}33`, paddingTop: 6,
  },
  attrCapLabel: {
    fontFamily: "'Special Elite', cursive", fontSize: 8, color: T.accentDim,
    letterSpacing: 2,
  },
  attrCapInput: {
    width: 36, background: "transparent", border: "none", borderBottom: `1px solid ${T.accentDark}55`,
    color: T.accentDim, fontFamily: "'Courier Prime', monospace", fontSize: 12,
    textAlign: "center", outline: "none",
  },

  // Combat
  combatGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 14, marginBottom: 12 },
  fatigueRow: { display: "flex", justifyContent: "center", gap: 6, marginTop: 4 },
  fatigueDot: {
    width: 28, height: 28, borderRadius: "50%", border: `2px solid ${T.accentDark}`,
    background: "transparent", color: T.accentDark, fontFamily: "'Courier Prime', monospace",
    fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", outline: "none", transition: "all 0.2s",
  },
  fatigueFilled: { background: T.accentDim, borderColor: T.accentDim, color: T.bg },
  fatigueDeath: { background: T.stamp, borderColor: T.stamp, color: T.pageBg },
  statBox: {
    background: "linear-gradient(180deg, #1a1410 0%, #171210 100%)", border: `1px solid ${T.accentDark}`, borderRadius: 3,
    padding: "14px", textAlign: "center",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
  },
  statLabel: { fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 900, color: T.accent, letterSpacing: 2 },
  statSub: { fontSize: 8, letterSpacing: 2, color: T.accentDim, marginBottom: 10, textTransform: "uppercase" },
  statTooltip: {
    position: "absolute", bottom: "calc(100% + 12px)", left: "50%", transform: "translateX(-50%)",
    background: T.pageBg, border: "none", borderRadius: 0,
    padding: "14px 18px 14px 32px", fontFamily: "'Special Elite', cursive", fontSize: 12,
    color: T.textDark, lineHeight: "22px", whiteSpace: "pre-line", width: 300,
    zIndex: 100,
    boxShadow: "0 6px 24px rgba(0,0,0,0.5)",
    pointerEvents: "none", textAlign: "left", fontWeight: 400, letterSpacing: 0.5,
    backgroundImage: `repeating-linear-gradient(transparent, transparent 21px, ${T.pageBorder} 21px, ${T.pageBorder} 22px), linear-gradient(90deg, transparent 30px, #c4636a33 30px, #c4636a33 32px, transparent 32px)`,
    backgroundSize: "100% 22px, 100% 100%",
    backgroundPosition: "0 12px, 0 0",
    clipPath: "polygon(0% 2%, 3% 0%, 6% 2%, 10% 0%, 14% 1%, 18% 0%, 22% 2%, 26% 0%, 30% 1%, 34% 0%, 38% 2%, 42% 0%, 46% 1%, 50% 0%, 54% 2%, 58% 0%, 62% 1%, 66% 0%, 70% 2%, 74% 0%, 78% 1%, 82% 0%, 86% 2%, 90% 0%, 94% 1%, 97% 0%, 100% 2%, 100% 6%, 99% 12%, 100% 19%, 99% 26%, 100% 33%, 99% 40%, 100% 48%, 99% 56%, 100% 64%, 99% 72%, 100% 80%, 99% 88%, 100% 95%, 100% 100%, 96% 99%, 91% 100%, 86% 98%, 81% 100%, 75% 99%, 69% 100%, 63% 98%, 57% 100%, 51% 99%, 45% 100%, 39% 98%, 33% 100%, 27% 99%, 21% 100%, 15% 98%, 9% 100%, 4% 99%, 0% 100%, 1% 94%, 0% 87%, 1% 80%, 0% 72%, 1% 64%, 0% 56%, 1% 48%, 0% 40%, 1% 32%, 0% 24%, 1% 16%, 0% 9%)",
  },
  statRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: 4 },
  statInput: {
    width: 60, background: "transparent", border: "none", borderBottom: `2px solid ${T.accentDark}`,
    color: T.text, fontFamily: "'Courier Prime', monospace", fontSize: 28,
    textAlign: "center", outline: "none", fontWeight: 700,
  },
  statInputLg: {
    width: 70, background: "transparent", border: "none", borderBottom: `2px solid ${T.accentDark}`,
    color: T.text, fontFamily: "'Courier Prime', monospace", fontSize: 28,
    textAlign: "center", outline: "none", fontWeight: 700,
  },
  statInputText: {
    width: 80, background: "transparent", border: "none", borderBottom: `2px solid ${T.accentDark}`,
    color: T.text, fontFamily: "'Courier Prime', monospace", fontSize: 20,
    textAlign: "center", outline: "none",
  },
  statSlash: { color: T.accentDark, fontSize: 24, margin: "0 2px" },
  statBig: { fontFamily: "'Courier Prime', monospace", fontSize: 36, fontWeight: 700, color: T.text },
  statUnit: { fontSize: 11, color: T.accentDim, letterSpacing: 2, marginTop: 4 },
  statFormula: { fontSize: 9, color: T.accentDim, letterSpacing: 1, marginTop: 6, fontFamily: "'Courier Prime', monospace" },

  // HP Bar
  hpBarOuter: { width: "100%", height: 6, background: "#0d0b08", borderRadius: 3, marginTop: 8, border: `1px solid ${T.accentDark}33`, overflow: "hidden" },
  hpBarInner: { height: "100%", borderRadius: 2, transition: "width 0.4s ease, background 0.4s ease", boxShadow: "0 0 4px currentColor" },

  // Sanity
  sanityBlock: { display: "flex", gap: 24, flexWrap: "wrap" },
  sanityMain: { flex: 1, minWidth: 200, background: T.bg, border: `1px solid ${T.accentDark}`, borderRadius: 3, padding: 16, textAlign: "center" },
  sanityLabel: { fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 900, color: T.accent, letterSpacing: 3, marginBottom: 10 },
  sanityRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: 4 },
  sanityInput: {
    width: 70, background: "transparent", border: "none", borderBottom: `2px solid ${T.accentDark}`,
    color: T.text, fontFamily: "'Courier Prime', monospace", fontSize: 32,
    textAlign: "center", outline: "none", fontWeight: 700,
  },
  sanityMax: { fontFamily: "'Courier Prime', monospace", fontSize: 20, color: T.accentDim },
  sanityDCs: { flex: 1, minWidth: 220, background: T.bg, border: `1px solid ${T.accentDark}`, borderRadius: 3, padding: 16 },
  sanityDCTitle: { fontFamily: "'Special Elite', cursive", fontSize: 12, letterSpacing: 3, color: T.accent, marginBottom: 12, textAlign: "center" },
  sanityDCRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8 },
  sanityDCLabel: { fontFamily: "'Special Elite', cursive", fontSize: 12, color: T.accentDim, letterSpacing: 1, minWidth: 90 },
  sanityDCSelect: {
    background: T.bg, border: `1px solid ${T.accentDark}`, borderRadius: 2,
    color: T.text, fontFamily: "'Courier Prime', monospace", fontSize: 11,
    padding: "3px 6px", outline: "none", flex: 1,
  },

  // Skills
  skillsInfoBar: {
    display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 14,
    padding: "8px 12px", background: T.bgInput, borderRadius: 3,
    border: `1px solid ${T.accentDark}33`, alignItems: "center",
  },
  skillsInfoItem: {
    fontFamily: "'Courier Prime', monospace", fontSize: 11, color: T.accent,
    fontWeight: 700, letterSpacing: 1,
  },
  skillsInfoHint: {
    fontFamily: "'Courier Prime', monospace", fontSize: 9, color: T.accentDim,
    letterSpacing: 1, marginLeft: "auto",
  },
  skillsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 },
  skillGroup: { background: "linear-gradient(180deg, #1a141066 0%, #15120f66 100%)", border: `1px solid ${T.accentDark}33`, borderRadius: 3, padding: 12 },
  skillGroupHeader: {
    fontFamily: "'Special Elite', cursive", fontSize: 11, letterSpacing: 3, color: T.accent,
    borderBottom: `1px solid ${T.accentDark}`, paddingBottom: 6, marginBottom: 8,
  },
  skillRow: { display: "flex", alignItems: "center", padding: "4px 4px", gap: 6, borderRadius: 2, transition: "background 0.15s" },
  skillTrainedBtn: {
    width: 18, height: 18, background: "transparent", border: `1px solid ${T.accentDark}`,
    color: T.accentDark, cursor: "pointer", fontSize: 10, display: "flex",
    alignItems: "center", justifyContent: "center", borderRadius: 2,
    outline: "none", flexShrink: 0, padding: 0, lineHeight: 1,
    transition: "all 0.2s",
  },
  skillTrainedActive: { color: T.accent, borderColor: T.accent, background: `${T.accent}11` },
  skillName: { fontFamily: "'Courier Prime', monospace", fontSize: 11, color: T.accentDim },
  skillHasRanks: { color: T.text, fontWeight: 700 },
  skillControls: { display: "flex", alignItems: "center", gap: 4, flexShrink: 0 },
  skillBtn: {
    width: 20, height: 20, background: "transparent", border: `1px solid ${T.accentDark}`,
    color: T.accentDim, cursor: "pointer", fontSize: 14, display: "flex",
    alignItems: "center", justifyContent: "center", borderRadius: 2,
    fontFamily: "'Courier Prime', monospace", lineHeight: 1, padding: 0, outline: "none",
  },
  skillBtnDisabled: { opacity: 0.25, cursor: "default" },
  skillRanks: { fontFamily: "'Courier Prime', monospace", fontSize: 12, color: T.text, width: 20, textAlign: "center" },
  skillTotal: {
    fontFamily: "'Courier Prime', monospace", fontSize: 12, color: T.accentDim,
    width: 28, textAlign: "right", fontWeight: 700,
  },
  skillCost: {
    fontFamily: "'Courier Prime', monospace", fontSize: 9, color: T.accentDim,
    width: 30, textAlign: "right", opacity: 0.7,
  },

  // Knowledge
  knowledgeHeader: {
    fontFamily: "'Special Elite', cursive", fontSize: 10, color: T.accentDim,
    letterSpacing: 2, padding: "6px 0 4px", borderTop: `1px solid ${T.accentDark}33`, marginTop: 4,
  },
  knowledgeRemoveBtn: {
    width: 16, height: 16, background: "transparent", border: `1px solid ${T.stamp}44`,
    color: T.stamp, cursor: "pointer", fontSize: 9, display: "flex",
    alignItems: "center", justifyContent: "center", borderRadius: 2,
    outline: "none", marginLeft: 2, padding: 0, lineHeight: 1, flexShrink: 0,
  },
  knowledgeAdder: { marginTop: 6, paddingTop: 6, borderTop: `1px dashed ${T.accentDark}33` },
  knowledgeSelect: {
    width: "100%", background: T.bg, border: `1px solid ${T.accentDark}`, borderRadius: 2,
    color: T.accentDim, fontFamily: "'Courier Prime', monospace", fontSize: 10,
    padding: "4px 6px", outline: "none", marginBottom: 4,
  },
  knowledgeCustomRow: { display: "flex", gap: 4 },
  knowledgeCustomInput: {
    flex: 1, background: "transparent", border: "none", borderBottom: `1px solid ${T.accentDark}55`,
    color: T.text, fontFamily: "'Courier Prime', monospace", fontSize: 10,
    padding: "3px 2px", outline: "none",
  },
  knowledgeCustomBtn: {
    width: 22, height: 22, background: T.accentDark, border: "none", borderRadius: 2,
    color: T.text, cursor: "pointer", fontSize: 14, display: "flex",
    alignItems: "center", justifyContent: "center", outline: "none", padding: 0,
    fontFamily: "'Courier Prime', monospace", flexShrink: 0,
  },

  // Merits & Flaws
  mfBlock: {},
  mfHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    borderBottom: `1px solid ${T.accentDark}`, paddingBottom: 6, marginBottom: 10,
  },
  mfTitle: {
    fontFamily: "'Special Elite', cursive", fontSize: 12, letterSpacing: 4, color: T.accent,
  },
  mfCpBadge: {
    fontFamily: "'Courier Prime', monospace", fontSize: 11, color: T.accent,
    background: `${T.accent}11`, border: `1px solid ${T.accent}33`, borderRadius: 3,
    padding: "2px 10px", fontWeight: 700, letterSpacing: 1,
  },
  mfEntry: {
    display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
    padding: "4px 0",
  },
  mfCost: {
    fontFamily: "'Courier Prime', monospace", fontSize: 14, fontWeight: 700,
    color: T.stamp, width: 28, textAlign: "center", flexShrink: 0,
  },
  mfCostSelect: {
    background: T.bg, border: `1px solid ${T.accentDark}`, borderRadius: 2,
    color: T.text, fontFamily: "'Courier Prime', monospace", fontSize: 11,
    padding: "3px 4px", outline: "none", width: 60, flexShrink: 0,
  },

  // Weapons & Armor
  weaponRemoveBtn: {
    width: 22, height: 22, background: "transparent", border: `1px solid ${T.stamp}55`,
    color: T.stamp, cursor: "pointer", fontSize: 11, display: "flex",
    alignItems: "center", justifyContent: "center", borderRadius: 2,
    outline: "none", flexShrink: 0, padding: 0,
  },
  weaponAddBtn: {
    width: "100%", background: "transparent", border: `1px dashed ${T.accentDark}55`,
    borderRadius: 3, color: T.accentDim, fontFamily: "'Special Elite', cursive",
    fontSize: 11, letterSpacing: 3, padding: "10px", cursor: "pointer",
    outline: "none", transition: "all 0.2s",
  },

  // Property Tags
  propTagWrap: {
    display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6, minHeight: 24,
  },
  propTag: {
    display: "inline-flex", alignItems: "center", gap: 4,
    background: `${T.accent}18`, border: `1px solid ${T.accent}44`, borderRadius: 3,
    padding: "3px 8px", fontFamily: "'Courier Prime', monospace", fontSize: 10,
    color: T.accent, letterSpacing: 1, cursor: "default", position: "relative",
    transition: "all 0.2s",
  },
  propTagX: {
    cursor: "pointer", color: T.accentDim, fontSize: 9, marginLeft: 2,
    opacity: 0.6, transition: "opacity 0.2s",
  },
  propTooltip: {
    position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
    background: T.pageBg, border: "none", borderRadius: 0,
    padding: "14px 18px 14px 32px", fontFamily: "'Special Elite', cursive", fontSize: 12,
    color: T.textDark, lineHeight: "22px", whiteSpace: "pre-line", width: 250,
    zIndex: 10000,
    boxShadow: "0 6px 24px rgba(0,0,0,0.5)",
    pointerEvents: "none",
    backgroundImage: `repeating-linear-gradient(transparent, transparent 21px, ${T.pageBorder} 21px, ${T.pageBorder} 22px), linear-gradient(90deg, transparent 28px, #c4636a33 28px, #c4636a33 30px, transparent 30px)`,
    backgroundSize: "100% 22px, 100% 100%",
    backgroundPosition: "0 10px, 0 0",
    clipPath: "polygon(0% 2%, 2% 0%, 5% 3%, 8% 0%, 12% 2%, 16% 0%, 19% 1%, 23% 0%, 27% 3%, 31% 0%, 35% 2%, 39% 0%, 43% 1%, 47% 0%, 51% 2%, 55% 0%, 59% 3%, 63% 0%, 67% 1%, 71% 0%, 75% 2%, 79% 0%, 83% 1%, 87% 0%, 91% 2%, 95% 0%, 98% 2%, 100% 0%, 100% 4%, 99% 8%, 100% 13%, 99% 18%, 100% 24%, 99% 30%, 100% 37%, 99% 44%, 100% 51%, 99% 58%, 100% 65%, 99% 72%, 100% 79%, 99% 85%, 100% 91%, 99% 96%, 100% 100%, 97% 99%, 93% 100%, 89% 98%, 85% 100%, 80% 99%, 75% 100%, 70% 98%, 65% 100%, 60% 99%, 55% 100%, 49% 98%, 43% 100%, 37% 99%, 31% 100%, 25% 98%, 19% 100%, 13% 99%, 8% 100%, 4% 98%, 0% 100%, 1% 95%, 0% 89%, 1% 83%, 0% 76%, 1% 69%, 0% 62%, 1% 55%, 0% 48%, 1% 41%, 0% 34%, 1% 27%, 0% 20%, 1% 13%, 0% 7%)",
  },
  propPickerBtn: {
    background: "transparent", border: `1px dashed ${T.accentDark}55`, borderRadius: 2,
    color: T.accentDim, fontFamily: "'Special Elite', cursive", fontSize: 10,
    letterSpacing: 2, padding: "4px 12px", cursor: "pointer", outline: "none",
  },
  propPickerDrop: {
    background: T.bg, border: `1px solid ${T.accentDark}`, borderRadius: 3,
    padding: 12, marginTop: 4, maxHeight: 260, overflowY: "auto",
    boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
  },
  propPickerCat: {
    fontFamily: "'Special Elite', cursive", fontSize: 9, letterSpacing: 3,
    color: T.accentDim, marginBottom: 4, marginTop: 8, borderBottom: `1px solid ${T.accentDark}33`, paddingBottom: 2,
  },
  propPickerGrid: {
    display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4,
  },
  propPickerItem: {
    background: T.bgCard, border: `1px solid ${T.accentDark}55`, borderRadius: 2,
    color: T.accentDim, fontFamily: "'Courier Prime', monospace", fontSize: 10,
    padding: "3px 8px", cursor: "pointer", outline: "none",
    transition: "all 0.15s",
  },
  propPickerItemActive: {
    background: `${T.accent}22`, borderColor: `${T.accent}88`, color: T.accent,
  },

  // Spellbook
  spellbookBtn: {
    width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
    background: "linear-gradient(180deg, #1a1410 0%, #151210 100%)", border: `1px solid ${T.accent}44`,
    borderRadius: 3, padding: "8px 10px", marginTop: 8, cursor: "pointer", outline: "none",
    fontFamily: "'Special Elite', cursive", fontSize: 11, color: T.accent,
    letterSpacing: 2, transition: "all 0.2s",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
  },
  spellCard: {
    background: "#f0eadd", border: `1px solid ${T.pageBorder}`, borderRadius: 3,
    padding: 14, marginBottom: 12,
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  },
  spellCardHeader: {
    display: "flex", alignItems: "center", gap: 8,
    borderBottom: `1px solid ${T.pageBorder}`, paddingBottom: 8, marginBottom: 10,
  },
  spellNameInput: {
    flex: 1, background: "transparent", border: "none", borderBottom: `1px solid ${T.accentDim}55`,
    fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700,
    color: T.bgAlt, padding: "2px 0", outline: "none",
  },
  spellKindBadge: {
    fontFamily: "'Special Elite', cursive", fontSize: 8, letterSpacing: 3,
    color: T.stamp, border: `1px solid ${T.stamp}55`, borderRadius: 2,
    padding: "2px 8px", flexShrink: 0,
  },
  spellRemoveBtn: {
    width: 20, height: 20, background: "transparent", border: `1px solid ${T.stamp}33`,
    color: T.stamp, cursor: "pointer", fontSize: 10, display: "flex",
    alignItems: "center", justifyContent: "center", borderRadius: 2,
    outline: "none", flexShrink: 0, padding: 0, opacity: 0.6,
  },
  spellFields: {},
  spellFieldRow: {
    display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8,
  },
  spellField: {
    flex: 1, minWidth: 80,
  },
  spellFieldLabel: {
    display: "block", fontFamily: "'Special Elite', cursive", fontSize: 9,
    color: T.accentDim, letterSpacing: 2, marginBottom: 2, textTransform: "uppercase",
  },
  spellInput: {
    width: "100%", background: "transparent", border: "none", borderBottom: `1px solid ${T.accentDim}44`,
    color: T.textDark, fontFamily: "'Courier Prime', monospace", fontSize: 12,
    padding: "3px 2px", outline: "none",
  },
  spellSelect: {
    width: "100%", background: T.pageBg, border: `1px solid ${T.pageBorder}`, borderRadius: 2,
    color: T.textDark, fontFamily: "'Courier Prime', monospace", fontSize: 11,
    padding: "3px 4px", outline: "none",
  },
  spellTextarea: {
    width: "100%", background: "#f4efe622", border: `1px solid ${T.pageBorder}`, borderRadius: 2,
    color: T.textDark, fontFamily: "'Courier Prime', monospace", fontSize: 11,
    padding: "6px 8px", outline: "none", resize: "vertical", lineHeight: 1.6,
  },
  spellAddBtn: {
    flex: 1, background: "transparent", border: `1px dashed ${T.accentDim}55`,
    borderRadius: 3, color: T.accentDim, fontFamily: "'Special Elite', cursive",
    fontSize: 11, letterSpacing: 2, padding: "8px", cursor: "pointer", outline: "none",
  },

  // Footer
  dossierFooter: { marginTop: 32, paddingTop: 16, position: "relative", zIndex: 1 },
  footerLine: { height: 1, background: `linear-gradient(90deg, transparent, ${T.accentDark}66, ${T.accentDark}, ${T.accentDark}66, transparent)` },
  footerText: {
    fontFamily: "'Special Elite', cursive", fontSize: 8, letterSpacing: 4, color: T.accentDark,
    textAlign: "center", marginTop: 12,
  },
  // Combat Reference
  combatRefCat: {
    fontFamily: "'Special Elite', cursive", fontSize: 11, letterSpacing: 4, color: T.accentDark,
    borderBottom: `1px solid ${T.pageBorder}`, paddingBottom: 3, marginBottom: 8, fontWeight: 700,
  },
  combatRefEntry: {
    marginBottom: 8, paddingLeft: 8, borderLeft: `2px solid ${T.pageBorder}44`,
  },
  combatRefName: {
    fontFamily: "'Playfair Display', serif", fontSize: 13, fontWeight: 700, color: T.bgAlt, marginBottom: 2,
  },
  combatRefDesc: {
    fontFamily: "'Courier Prime', monospace", fontSize: 11, color: T.textDark, lineHeight: 1.6,
  },

  // Print Overlay
  printOverlay: {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
    background: T.pageBg, overflowY: "auto",
  },
  printControls: {
    position: "sticky", top: 0, zIndex: 10, background: T.bgAlt, padding: "12px 24px",
    display: "flex", justifyContent: "space-between", alignItems: "center",
    borderBottom: `2px solid ${T.accentDark}`,
  },
  printPage: {
    maxWidth: 780, margin: "0 auto", padding: "30px 50px 60px",
    fontFamily: "'Courier Prime', monospace", fontSize: 12, lineHeight: 1.5, color: T.bgAlt,
  },
  printSection: {
    marginBottom: 20, pageBreakInside: "avoid",
  },
  printSectionTitle: {
    fontFamily: "'Special Elite', cursive", fontSize: 13, letterSpacing: 4, color: T.accentDark,
    borderBottom: `1px solid ${T.pageBorder}`, paddingBottom: 4, marginBottom: 10,
  },
  printRow: {
    display: "flex", flexWrap: "wrap", gap: 16, fontSize: 11, marginBottom: 4,
  },
  printStatBox: {
    flex: 1, minWidth: 80, border: `1px solid ${T.pageBorder}`, borderRadius: 3,
    padding: 8, textAlign: "center",
  },
  printBtn: {
    background: "transparent", border: `1px solid ${T.accent}44`,
    color: T.accent, fontFamily: "'Special Elite', cursive", fontSize: 10, letterSpacing: 2,
    padding: "6px 16px", cursor: "pointer", borderRadius: 2, outline: "none",
    opacity: 0.7, transition: "opacity 0.2s",
  },
  resetBtn: {
    background: "transparent", border: `1px solid ${T.accentDark}`,
    color: T.accentDim, fontFamily: "'Special Elite', cursive", fontSize: 10, letterSpacing: 2,
    padding: "6px 16px", cursor: "pointer", borderRadius: 2, outline: "none",
    opacity: 0.5, transition: "opacity 0.2s",
  },

  // Journal Stamp Button
  journalStamp: {
    background: T.bgCard, border: `3px solid ${T.accent}`, borderBottom: "none",
    borderRadius: "6px 6px 0 0", padding: "10px 20px",
    cursor: "pointer", outline: "none", transform: "rotate(-2deg)",
    transition: "all 0.3s ease, transform 0.2s ease",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
    marginLeft: "auto", flexShrink: 0, alignSelf: "flex-end",
    position: "relative", top: 1,
    boxShadow: "0 -2px 8px rgba(196,164,108,0.08)",
  },
  journalStampInner: {
    fontFamily: "'Special Elite', cursive", fontSize: 13, color: T.accent,
    letterSpacing: 4, fontWeight: 700, lineHeight: 1,
  },
  journalStampCount: {
    fontFamily: "'Courier Prime', monospace", fontSize: 8, color: T.accentDim,
    letterSpacing: 2, marginTop: 2,
  },

  // Journal Overlay
  journalOverlay: {
    position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
    background: "rgba(10, 8, 5, 0.92)", zIndex: 1000,
    display: "flex", justifyContent: "center", alignItems: "flex-start",
    padding: "24px 16px", overflowY: "auto",
    animation: "fadeIn 0.3s ease",
  },
  journalPage: {
    width: "100%", maxWidth: 720, background: T.pageBg,
    borderRadius: 2, position: "relative", overflow: "hidden",
    boxShadow: "0 8px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(196,164,108,0.2)",
    minHeight: "80vh",
  },
  jpHoles: {
    position: "absolute", top: 0, left: 28, bottom: 0,
    display: "flex", flexDirection: "column", justifyContent: "space-evenly",
    padding: "40px 0", zIndex: 1, pointerEvents: "none",
  },
  jpHole: {
    width: 10, height: 10, borderRadius: "50%", background: "rgba(10,8,5,0.92)",
    border: "1px solid #d4c5a9", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.3)",
  },
  jpRedLine: {
    position: "absolute", top: 0, bottom: 0, left: 72, width: 2,
    background: "linear-gradient(180deg, transparent 0%, #c4636a44 5%, #c4636a44 95%, transparent 100%)",
    zIndex: 1, pointerEvents: "none",
  },
  jpContent: {
    padding: "40px 48px 40px 88px", position: "relative", zIndex: 2,
    backgroundImage: `repeating-linear-gradient(transparent, transparent 31px, ${T.pageBorder} 31px, ${T.pageBorder} 32px)`,
    backgroundSize: "100% 32px",
    backgroundPosition: "0 24px",
  },

  // Journal Page Header
  jpHeader: { textAlign: "center", paddingBottom: 20, marginBottom: 20 },
  jpLogo: {
    fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 900,
    color: T.textDark, letterSpacing: 5, lineHeight: 1,
  },
  jpLogoSub: {
    fontFamily: "'Special Elite', cursive", fontSize: 8, letterSpacing: 5,
    color: T.accentDim, marginTop: 4,
  },
  jpDivider: {
    width: 200, height: 2, background: `linear-gradient(90deg, transparent, ${T.accentDim}, transparent)`,
    margin: "12px auto",
  },
  jpAgent: {
    fontFamily: "'Special Elite', cursive", fontSize: 18, color: T.textDark,
    letterSpacing: 3, marginTop: 8,
  },
  jpAgentSub: {
    fontFamily: "'Courier Prime', monospace", fontSize: 10, color: T.accentDim,
    letterSpacing: 1, marginTop: 2,
  },
  jpFieldJournal: {
    fontFamily: "'Special Elite', cursive", fontSize: 16, color: T.stamp,
    border: `3px solid ${T.stamp}`, display: "inline-block", padding: "4px 20px",
    transform: "rotate(-3deg)", letterSpacing: 5, marginTop: 14, opacity: 0.7,
  },

  // Journal Page Toolbar
  jpToolbar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    flexWrap: "wrap", gap: 8, marginBottom: 20,
    borderBottom: `1px solid ${T.pageBorder}`, paddingBottom: 12,
  },
  jpToolbarLeft: {},
  jpToolbarRight: { display: "flex", gap: 6, flexWrap: "wrap" },
  jpEntryCount: {
    fontFamily: "'Special Elite', cursive", fontSize: 11, color: T.accentDim, letterSpacing: 2,
  },
  jpExportBtn: {
    background: T.textDark, border: "none", borderRadius: 2,
    color: T.pageBg, fontFamily: "'Special Elite', cursive", fontSize: 10,
    letterSpacing: 1, padding: "5px 12px", cursor: "pointer", outline: "none",
  },
  jpCloseBtn: {
    background: T.stamp, border: "none", borderRadius: 2,
    color: T.pageBg, fontFamily: "'Special Elite', cursive", fontSize: 10,
    letterSpacing: 1, padding: "5px 12px", cursor: "pointer", outline: "none",
  },

  // Journal Page Form
  jpNewEntry: {
    background: "#ebe5d8", border: `1px solid ${T.pageBorder}`, borderRadius: 2,
    padding: 16, marginBottom: 24,
  },
  jpNewEntryHeader: {
    fontFamily: "'Special Elite', cursive", fontSize: 12, color: T.accentDim,
    letterSpacing: 4, textAlign: "center", marginBottom: 14,
  },
  jpLabel: {
    display: "block", fontFamily: "'Special Elite', cursive", fontSize: 10,
    color: T.accentDim, letterSpacing: 2, marginBottom: 3, textTransform: "uppercase",
  },
  jpInput: {
    width: "100%", background: "transparent", border: "none",
    borderBottom: `1px solid ${T.accentDim}66`, color: T.textDark,
    fontFamily: "'Special Elite', cursive", fontSize: 14,
    padding: "6px 2px", outline: "none",
  },
  jpTextarea: {
    width: "100%", background: T.pageBg, border: `1px solid ${T.pageBorder}`,
    borderRadius: 2, color: T.textDark,
    fontFamily: "'Special Elite', cursive", fontSize: 14,
    padding: "10px 12px", outline: "none", resize: "vertical",
    lineHeight: "32px",
    backgroundImage: `repeating-linear-gradient(transparent, transparent 31px, ${T.pageBorder} 31px, ${T.pageBorder} 32px)`,
    backgroundSize: "100% 32px",
    backgroundPosition: "0 10px",
  },
  jpAddBtn: {
    flex: 1, marginTop: 12, background: T.textDark, border: "none", borderRadius: 2,
    color: T.pageBg, fontFamily: "'Special Elite', cursive", fontSize: 12,
    letterSpacing: 3, padding: "10px 20px", cursor: "pointer", outline: "none",
    display: "block", width: "100%", textAlign: "center",
  },
  jpCancelBtn: {
    flex: 1, marginTop: 12, background: "transparent", border: `1px solid ${T.accentDim}`,
    borderRadius: 2, color: T.accentDim, fontFamily: "'Special Elite', cursive",
    fontSize: 12, letterSpacing: 3, padding: "10px 20px", cursor: "pointer",
    outline: "none", textAlign: "center",
  },

  // Journal Page Entries
  jpEntries: { display: "flex", flexDirection: "column", gap: 16 },
  jpEntry: {
    borderBottom: `1px solid ${T.pageBorder}`, paddingBottom: 16,
  },
  jpEntryHead: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    gap: 12, marginBottom: 8,
  },
  jpEntryTitle: {
    fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700,
    color: T.textDark, lineHeight: 1.3,
  },
  jpEntryMeta: {
    fontFamily: "'Special Elite', cursive", fontSize: 10, color: T.accentDim,
    letterSpacing: 1, marginTop: 2,
  },
  jpEntryBody: {
    fontFamily: "'Special Elite', cursive", fontSize: 14, color: T.textDark,
    lineHeight: "32px", whiteSpace: "pre-wrap",
  },
  jpActionBtn: {
    width: 26, height: 26, background: "transparent", border: `1px solid ${T.pageBorder}`,
    color: T.accentDim, cursor: "pointer", fontSize: 14, display: "flex",
    alignItems: "center", justifyContent: "center", borderRadius: 2,
    outline: "none",
  },
  jpEmpty: {
    fontFamily: "'Special Elite', cursive", fontSize: 13, color: T.accentDim,
    textAlign: "center", padding: "32px 0", letterSpacing: 2, fontStyle: "italic",
  },
  jpFooter: {
    fontFamily: "'Special Elite', cursive", fontSize: 8, letterSpacing: 4,
    color: T.accentDim, textAlign: "center", marginTop: 40, paddingTop: 16,
    borderTop: `1px solid ${T.pageBorder}`,
  },
};
}

// Mobile style overrides (layout only, not theme-dependent)
const mobileStyles = {
  headerInner: { padding: "12px 12px 6px", gap: 8 },
  logoText: { fontSize: 18, letterSpacing: 2 },
  logoSub: { fontSize: 7, letterSpacing: 3 },
  classifiedStamp: { fontSize: 10, padding: "2px 8px", letterSpacing: 2 },
  headerBar: { padding: "3px 12px" },
  headerBarText: { fontSize: 7, letterSpacing: 2 },
  tabRow: { padding: "0 8px", overflowX: "auto", WebkitOverflowScrolling: "touch" },
  tab: { padding: "8px 10px", minWidth: 100, flex: "0 0 auto" },
  tabLabel: { fontSize: 7 },
  tabName: { fontSize: 11 },
  tabRace: { fontSize: 8 },
  addTab: { width: 28, padding: "6px 0", fontSize: 16 },
  journalStamp: { padding: "6px 10px", marginLeft: 4 },
  journalStampInner: { fontSize: 9, letterSpacing: 2 },
  journalStampCount: { fontSize: 7 },
  dossierWrap: { padding: "0 8px 24px" },
  dossierPage: { padding: "16px 12px" },
  sectionHeader: { padding: "12px 12px" },
  sectionTitle: { fontSize: 13, letterSpacing: 4 },
  sectionContent: { padding: "12px" },
  identityGrid: { flexDirection: "column", gap: 16 },
  photoArea: { flex: "0 0 auto", width: "100%", display: "flex", flexDirection: "column", alignItems: "center" },
  photoFrame: { width: 100, height: 120, marginBottom: 8 },
  identityFields: { minWidth: "100%" },
  fieldRow: { flexDirection: "column", gap: 8 },
  attrGrid: { gridTemplateColumns: "repeat(2, 1fr)", gap: 8 },
  attrCard: { padding: "10px 8px" },
  attrName: { fontSize: 16 },
  attrScoreInput: { width: 48, fontSize: 24 },
  attrMod: { fontSize: 14 },
  combatGrid: { gridTemplateColumns: "repeat(2, 1fr)", gap: 10 },
  statBox: { padding: "10px" },
  statLabel: { fontSize: 16 },
  statInput: { width: 50, fontSize: 24 },
  statInputLg: { width: 60, fontSize: 24 },
  sanityBlock: { flexDirection: "column", gap: 12 },
  sanityMain: { padding: 12 },
  sanityLabel: { fontSize: 16 },
  sanityInput: { width: 60, fontSize: 26 },
  sanityDCs: { padding: 12 },
  skillsGrid: { gridTemplateColumns: "1fr" },
  skillGroup: { padding: 10 },
  // Modals
  journalOverlay: { padding: "8px" },
  journalPage: { maxWidth: "100%", minHeight: "auto", borderRadius: 0 },
  jpHoles: { display: "none" },
  jpRedLine: { left: 12 },
  jpContent: { padding: "20px 16px 20px 24px" },
  jpHeader: { paddingBottom: 12, marginBottom: 12 },
  jpLogo: { fontSize: 18, letterSpacing: 3 },
  jpToolbar: { flexDirection: "column", gap: 8, alignItems: "stretch" },
  jpToolbarRight: { justifyContent: "center" },
};
