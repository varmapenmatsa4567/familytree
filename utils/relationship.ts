import { Datum } from "family-chart";

export enum RelationCode {
    F = "Father",
    M = "Mother",
    S = "Son",
    B = "Brother",
    Z = "Sister",
    D = "Daughter",
    W = "Wife",
    H = "Husband"
}

export enum ComplexRelationTelugu {
    M = "అమ్మ",
    F = "నాన్న",
    B = "అన్న / తమ్ముడు",
    Z = "అక్క / చెల్లెలు",
    W = "భార్య",
    H = "భర్త",
    S = "కొడుకు",
    D = "కూతురు",
    MB = "మావయ్య",
    MBW = "అత్త",
    FZ = "అత్త",
    FZH = "మావయ్య",
    MZ = "పెద్దమ్మ / చిన్నమ్మ",
    MZH = "పెదనాన్న / చిన్నాన్న",
    FB = "పెదనాన్న / చిన్నాన్న",
    FBW = "పెద్దమ్మ / చిన్నమ్మ",
    FF = "తాత",
    FM = "నాన్నమ్మ",
    MF = "తాత",
    MM = "అమ్మమ్మ",
    FZS = "బావ / మరిది",
    MBS = "బావ / మరిది",
    ZH = "బావ / మరిది",
    HB = "బావ / మరిది",
    WB = "బావ / మరిది",
    FZD = "వదిన / మరదలు",
    MBD = "వదిన / మరదలు",
    HS = "వదిన / మరదలు",
    BW = "వదిన / మరదలు",
    WZ = "వదిన / మరదలు"
}

interface RelationshipDef {
  code: RelationCode;           // canonical code
  english: string;
  telugu: string;

  generation: number;     // +2, +1, 0, -1, -2
  gender: "male" | "female" | "any";

  aliases?: string[];
}

export type PathStep = { from: string; to: string; type: string; gender: string };

export function mergeSteps(steps: PathStep[]) {
    let cur = steps;
    for (;;) {
        const merged: typeof cur = [];
        let changed = false;
        for (let i = 0; i < cur.length; i++) {
            if (i + 1 < cur.length && cur[i].type === 'parent' && cur[i + 1].type === 'spouse' && cur[i].gender !== cur[i + 1].gender) {
                merged.push({ from: cur[i].from, to: cur[i + 1].to, type: 'parent', gender: cur[i + 1].gender });
                i++; changed = true;
            } else if (i + 1 < cur.length && cur[i].type === 'sibling' && cur[i + 1].type === 'parent') {
                merged.push({ from: cur[i].from, to: cur[i + 1].to, type: 'parent', gender: cur[i + 1].gender });
                i++; changed = true;
            } else if (i + 1 < cur.length && cur[i].type === 'spouse' && cur[i + 1].type === 'child') {
                merged.push({ from: cur[i].from, to: cur[i + 1].to, type: 'child', gender: cur[i + 1].gender });
                i++; changed = true;
            } else if (i + 2 < cur.length && cur[i].type === 'parent' && cur[i + 1].type === 'sibling' && cur[i + 2].type === 'child' && cur[i].gender === cur[i + 1].gender) {
                merged.push({ from: cur[i].from, to: cur[i + 2].to, type: 'sibling', gender: cur[i + 2].gender });
                i += 2; changed = true;
            } else if (i + 1 < cur.length && cur[i].type === 'parent' && cur[i + 1].type === 'child') {
                merged.push({ from: cur[i].from, to: cur[i + 1].to, type: 'sibling', gender: cur[i + 1].gender });
                i++; changed = true;
            } else {
                merged.push(cur[i]);
            }
        }
        cur = merged;
        if (!changed) break;
    }
    return cur;
}

function stepToAbbrev(step: PathStep) {
    if (step.type === 'parent') return step.gender === 'F' ? 'M' : 'F';
    if (step.type === 'child') return step.gender === 'F' ? 'D' : 'S';
    if (step.type === 'sibling') return step.gender === 'F' ? 'Z' : 'B';
    return step.gender === 'F' ? 'W' : 'H';
}

export function stepsToAbbrev(steps: PathStep[]) {
    return steps.map(stepToAbbrev).join('');
}

export function getTeluguRelation(steps: PathStep[]) {
    const key = stepsToAbbrev(steps);
    return (ComplexRelationTelugu as any)[key] || null;
}

export function stepsToCode(steps: PathStep[]) {
    return steps.map(step => {
        if (step.type === 'parent') return step.gender === 'F' ? RelationCode.M : RelationCode.F;
        if (step.type === 'child') return step.gender === 'F' ? RelationCode.D : RelationCode.S;
        if (step.type === 'sibling') return step.gender === 'F' ? RelationCode.Z : RelationCode.B;
        return step.gender === 'F' ? RelationCode.W : RelationCode.H;
    }).join(' -> ');
}

export class RelationShipFinder {
    people: Datum[];
    _index: Record<string, Datum>;
    constructor(people: Datum[]) {
        this.people = people;
        this._index = Object.fromEntries(people.map(p => [p.id, p]));
    }

    _gender(id: string) {return (this._index[id] || {}).data.gender || "M";}
    _name(id: string)   { return (this._index[id] || {}).data.name  || id; }

    _parents(id: string)  { return (this._index[id].rels || {}).parents  || []; }
    _children(id: string) { return (this._index[id].rels || {}).children || []; }
    _spouses(id: string)  { return (this._index[id].rels || {}).spouses  || []; }

    findAllPaths(fromId: string, toId: string, maxDepth = 8) {
        const results: Array<Array<{ from: string; to: string; type: string; gender: string }>> = [];
        const self = this;

        function dfs(cur: string, path: Array<{ from: string; to: string; type: string; gender: string }>, visited: Set<string>, depth: number) {
            if (depth > maxDepth) return;
            if (cur === toId && path.length > 0) {
                results.push([...path]);
                return;
            }

            const neighbors = [
                ...self._parents(cur).map(id  => ({ id, type: "parent" })),
                ...self._children(cur).map(id => ({ id, type: "child" })),
                ...self._spouses(cur).map(id => ({ id, type: "spouse" })),
            ];

            for (const { id, type } of neighbors) {
                if (visited.has(id)) continue;
                visited.add(id);
                path.push({ from: cur, to: id, type, gender: self._gender(id) });
                dfs(id, path, visited, depth + 1);
                path.pop();
                visited.delete(id);
            }
        }

        const visited = new Set([fromId]);
        dfs(fromId, [], visited, 0);

        results.sort((a, b) => a.length - b.length);
        return results;
    }
}

export enum Relation {
    SELF = "self",

    FATHER = "father",
    MOTHER = "mother",

    SON = "son",
    DAUGHTER = "daughter",

    BROTHER = "brother",
    SISTER = "sister",

    HUSBAND = "husband",
    WIFE = "wife",

    // Grandparents
    PATERNAL_GRANDFATHER = "paternal_grandfather",
    PATERNAL_GRANDMOTHER = "paternal_grandmother",

    MATERNAL_GRANDFATHER = "maternal_grandfather",
    MATERNAL_GRANDMOTHER = "maternal_grandmother",

    // Uncles & Aunts
    PATERNAL_UNCLE = "paternal_uncle",
    PATERNAL_AUNT = "paternal_aunt",

    MATERNAL_UNCLE = "maternal_uncle",
    MATERNAL_AUNT = "maternal_aunt",

    // Nephews & Nieces
    PATERNAL_NEPHEW = "paternal_nephew",
    PATERNAL_NIECE = "paternal_niece",

    MATERNAL_NEPHEW = "maternal_nephew",
    MATERNAL_NIECE = "maternal_niece",

    // In-laws
    FATHER_IN_LAW = "father_in_law",
    MOTHER_IN_LAW = "mother_in_law",

    BROTHER_IN_LAW_HB = "brother_in_law_hb",
    BROTHER_IN_LAW_WB = "brother_in_law_wb",
    BROTHER_IN_LAW_SH = "brother_in_law_sh",

    SISTER_IN_LAW_HS = "sister_in_law_hs",
    SISTER_IN_LAW_WS = "sister_in_law_ws",
    SISTER_IN_LAW_BW = "sister_in_law_bw",

    // Children-in-law
    SON_IN_LAW = "son_in_law",
    DAUGHTER_IN_LAW = "daughter_in_law",

    // Grandchildren
    GRANDSON = "grandson",
    GRANDDAUGHTER = "granddaughter",

    // Great Grand Parents
    GREAT_GRANDFATHER = "great_grandfather",
    GREAT_GRANDMOTHER = "great_grandmother",

    // Great Grand children
    GREAT_GRANDSON = "great_grandson",
    GREAT_GRANDDAUGHTER = "great_granddaughter",

    // Extended
    PATERNAL_UNCLE_WIFE = "paternal_uncle_wife",
    COUSIN_PATERNAL_UNCLE_SON = "cousin_paternal_uncle_son",
    COUSIN_PATERNAL_UNCLE_DAUGHTER = "cousin_paternal_uncle_daughter",

    PATERNAL_AUNT_HUSBAND = "paternal_aunt_husband",
    CROSS_COUSIN_PATERNAL_AUNT_SON = "cross_cousin_paternal_aunt_son",
    CROSS_COUSIN_PATERNAL_AUNT_DAUGHTER = "corss_cousin_paternal_aunt_daughter",

    CROSS_COUSIN_MATERNAL_UNCLE_SON = "cross_cousin_maternal_uncle_son",
    CROSS_COUSIN_MATERNAL_UNCLE_DAUGHTER = "cross_cousin_maternal_uncle_daughter",
    MATERNAL_UNCLE_WIFE = "maternal_uncle_wife",

    COUSIN_MATERNAL_AUNT_SON = "cousin_maternal_aunt_son",
    COUSIN_MATERNAL_AUNT_DAUGHTER = "cousin_maternal_aunt_daughter",
    MATERNAL_AUNT_HUSBAND = "maternal_aunt_husband",


}



export const TELUGU_NAMES: Record<Relation, string> = {
    [Relation.SELF]: "నేను",

    [Relation.FATHER]: "నాన్న",
    [Relation.MOTHER]: "అమ్మ",

    [Relation.SON]: "కొడుకు",
    [Relation.DAUGHTER]: "కూతురు",

    [Relation.BROTHER]: "అన్న / తమ్ముడు",
    [Relation.SISTER]: "అక్క / చెల్లి",

    [Relation.HUSBAND]: "భర్త",
    [Relation.WIFE]: "భార్య",

    // Grandparents
    [Relation.PATERNAL_GRANDFATHER]: "తాతయ్య",
    [Relation.PATERNAL_GRANDMOTHER]: "నానమ్మ",

    [Relation.MATERNAL_GRANDFATHER]: "తాతయ్య",
    [Relation.MATERNAL_GRANDMOTHER]: "అమ్మమ్మ",

    // Uncles & Aunts
    [Relation.PATERNAL_UNCLE]: "పెదనాన్న / బాబాయి",
    [Relation.PATERNAL_AUNT]: "అత్త",

    [Relation.MATERNAL_UNCLE]: "మామయ్య",
    [Relation.MATERNAL_AUNT]: "పెద్దమ్మ / పిన్ని",

    // Nephews & Nieces
    [Relation.PATERNAL_NEPHEW]: "మేనల్లుడు / కొడుకు",
    [Relation.PATERNAL_NIECE]: "మేనకోడలు / కూతురు",

    [Relation.MATERNAL_NEPHEW]: "మేనల్లుడు / కొడుకు",
    [Relation.MATERNAL_NIECE]: "మేనకోడలు / కూతురు",

    // In-laws
    [Relation.FATHER_IN_LAW]: "మామయ్య",
    [Relation.MOTHER_IN_LAW]: "అత్త",

    [Relation.BROTHER_IN_LAW_HB]: "బావ / మరిది",
    [Relation.BROTHER_IN_LAW_WB]: "బావ / మరిది",
    [Relation.BROTHER_IN_LAW_SH]: "బావ / మరిది",

    [Relation.SISTER_IN_LAW_HS]: "మరదలు / వదిన",
    [Relation.SISTER_IN_LAW_WS]: "మరదలు / వదిన",
    [Relation.SISTER_IN_LAW_BW]: "మరదలు / వదిన",

    // Children-in-law
    [Relation.SON_IN_LAW]: "అల్లుడు",
    [Relation.DAUGHTER_IN_LAW]: "కోడలు",

    // Grandchildren
    [Relation.GRANDSON]: "మనవడు",
    [Relation.GRANDDAUGHTER]: "మనవరాలు",

    // Great Grand Parents
    [Relation.GREAT_GRANDFATHER]: "ముత్తాత",
    [Relation.GREAT_GRANDMOTHER]: "ముత్తమ్మ",

    // Great Grand children
    [Relation.GREAT_GRANDSON]: "ముని మనవడు",
    [Relation.GREAT_GRANDDAUGHTER]: "ముని మనవరాలు",

    // Paternal Uncle Family
    [Relation.PATERNAL_UNCLE_WIFE]: "పెద్దమ్మ / చిన్నమ్మ",

    [Relation.COUSIN_PATERNAL_UNCLE_SON]: "అన్న / తమ్ముడు",
    [Relation.COUSIN_PATERNAL_UNCLE_DAUGHTER]: "అక్క / చెల్లి",

    // Paternal Aunt Family
    [Relation.PATERNAL_AUNT_HUSBAND]: "మామయ్య",

    [Relation.CROSS_COUSIN_PATERNAL_AUNT_SON]: "బావ / మరిది",
    [Relation.CROSS_COUSIN_PATERNAL_AUNT_DAUGHTER]: "మరదలు / వదిన",

    // Maternal Uncle Family
    [Relation.MATERNAL_UNCLE_WIFE]: "అత్త",

    [Relation.CROSS_COUSIN_MATERNAL_UNCLE_SON]: "బావ / మరిది",
    [Relation.CROSS_COUSIN_MATERNAL_UNCLE_DAUGHTER]: "మరదలు / వదిన",

    // Maternal Aunt Family
    [Relation.MATERNAL_AUNT_HUSBAND]: "పెదనాన్న / బాబాయి",

    [Relation.COUSIN_MATERNAL_AUNT_SON]: "అన్న / తమ్ముడు",
    [Relation.COUSIN_MATERNAL_AUNT_DAUGHTER]: "అక్క / చెల్లి",
};

export const TRANSITIONS = {
    // Self
    [`${Relation.SELF}|${Relation.FATHER}`]: Relation.FATHER,
    [`${Relation.SELF}|${Relation.MOTHER}`]: Relation.MOTHER,
    [`${Relation.SELF}|${Relation.SON}`]: Relation.SON,
    [`${Relation.SELF}|${Relation.DAUGHTER}`]: Relation.DAUGHTER,
    [`${Relation.SELF}|${Relation.BROTHER}`]: Relation.BROTHER,
    [`${Relation.SELF}|${Relation.SISTER}`]: Relation.SISTER,
    [`${Relation.SELF}|${Relation.HUSBAND}`]: Relation.HUSBAND,
    [`${Relation.SELF}|${Relation.WIFE}`]: Relation.WIFE,

    // Father
    [`${Relation.FATHER}|${Relation.FATHER}`]: Relation.PATERNAL_GRANDFATHER,
    [`${Relation.FATHER}|${Relation.MOTHER}`]: Relation.PATERNAL_GRANDMOTHER,
    [`${Relation.FATHER}|${Relation.BROTHER}`]: Relation.PATERNAL_UNCLE,
    [`${Relation.FATHER}|${Relation.SISTER}`]: Relation.PATERNAL_AUNT,
    [`${Relation.FATHER}|${Relation.SON}`]: Relation.BROTHER,
    [`${Relation.FATHER}|${Relation.DAUGHTER}`]: Relation.SISTER,
    [`${Relation.FATHER}|${Relation.WIFE}`]: Relation.MOTHER,

    // Mother
    [`${Relation.MOTHER}|${Relation.FATHER}`]: Relation.MATERNAL_GRANDFATHER,
    [`${Relation.MOTHER}|${Relation.MOTHER}`]: Relation.MATERNAL_GRANDMOTHER,
    [`${Relation.MOTHER}|${Relation.BROTHER}`]: Relation.MATERNAL_UNCLE,
    [`${Relation.MOTHER}|${Relation.SISTER}`]: Relation.MATERNAL_AUNT,
    [`${Relation.MOTHER}|${Relation.SON}`]: Relation.BROTHER,
    [`${Relation.MOTHER}|${Relation.DAUGHTER}`]: Relation.SISTER,
    [`${Relation.MOTHER}|${Relation.HUSBAND}`]: Relation.FATHER,

    // Brother
    [`${Relation.BROTHER}|${Relation.SON}`]: Relation.PATERNAL_NEPHEW,
    [`${Relation.BROTHER}|${Relation.DAUGHTER}`]: Relation.PATERNAL_NIECE,
    [`${Relation.BROTHER}|${Relation.WIFE}`]: Relation.SISTER_IN_LAW_BW,

    // Sister
    [`${Relation.SISTER}|${Relation.SON}`]: Relation.MATERNAL_NEPHEW,
    [`${Relation.SISTER}|${Relation.DAUGHTER}`]: Relation.MATERNAL_NIECE,
    [`${Relation.SISTER}|${Relation.HUSBAND}`]: Relation.BROTHER_IN_LAW_SH,

    // Husband
    [`${Relation.HUSBAND}|${Relation.FATHER}`]: Relation.FATHER_IN_LAW,
    [`${Relation.HUSBAND}|${Relation.MOTHER}`]: Relation.MOTHER_IN_LAW,
    [`${Relation.HUSBAND}|${Relation.BROTHER}`]: Relation.BROTHER_IN_LAW_HB,
    [`${Relation.HUSBAND}|${Relation.SISTER}`]: Relation.SISTER_IN_LAW_HS,

    // Wife
    [`${Relation.WIFE}|${Relation.FATHER}`]: Relation.FATHER_IN_LAW,
    [`${Relation.WIFE}|${Relation.MOTHER}`]: Relation.MOTHER_IN_LAW,
    [`${Relation.WIFE}|${Relation.BROTHER}`]: Relation.BROTHER_IN_LAW_WB,
    [`${Relation.WIFE}|${Relation.SISTER}`]: Relation.SISTER_IN_LAW_WS,

    // Son
    [`${Relation.SON}|${Relation.SON}`]: Relation.GRANDSON,
    [`${Relation.SON}|${Relation.DAUGHTER}`]: Relation.GRANDDAUGHTER,
    [`${Relation.SON}|${Relation.WIFE}`]: Relation.DAUGHTER_IN_LAW,

    // Daughter
    [`${Relation.DAUGHTER}|${Relation.SON}`]: Relation.GRANDSON,
    [`${Relation.DAUGHTER}|${Relation.DAUGHTER}`]: Relation.GRANDDAUGHTER,
    [`${Relation.DAUGHTER}|${Relation.HUSBAND}`]: Relation.SON_IN_LAW,

    // Paternal Uncle
    [`${Relation.PATERNAL_UNCLE}|${Relation.SON}`]: Relation.COUSIN_PATERNAL_UNCLE_SON,
    [`${Relation.PATERNAL_UNCLE}|${Relation.DAUGHTER}`]: Relation.COUSIN_PATERNAL_UNCLE_DAUGHTER,
    [`${Relation.PATERNAL_UNCLE}|${Relation.WIFE}`]: Relation.PATERNAL_UNCLE_WIFE,

    // Paternal Aunt
    [`${Relation.PATERNAL_AUNT}|${Relation.SON}`]: Relation.CROSS_COUSIN_PATERNAL_AUNT_SON,
    [`${Relation.PATERNAL_AUNT}|${Relation.DAUGHTER}`]: Relation.CROSS_COUSIN_PATERNAL_AUNT_DAUGHTER,
    [`${Relation.PATERNAL_AUNT}|${Relation.HUSBAND}`]: Relation.PATERNAL_AUNT_HUSBAND,

    // Maternal Uncle
    [`${Relation.MATERNAL_UNCLE}|${Relation.SON}`]: Relation.CROSS_COUSIN_MATERNAL_UNCLE_SON,
    [`${Relation.MATERNAL_UNCLE}|${Relation.DAUGHTER}`]: Relation.CROSS_COUSIN_MATERNAL_UNCLE_DAUGHTER,
    [`${Relation.MATERNAL_UNCLE}|${Relation.WIFE}`]: Relation.MATERNAL_UNCLE_WIFE,

    // Maternal Aunt
    [`${Relation.MATERNAL_AUNT}|${Relation.SON}`]: Relation.COUSIN_MATERNAL_AUNT_SON,
    [`${Relation.MATERNAL_AUNT}|${Relation.DAUGHTER}`]: Relation.COUSIN_MATERNAL_AUNT_DAUGHTER,
    [`${Relation.MATERNAL_AUNT}|${Relation.HUSBAND}`]: Relation.MATERNAL_AUNT_HUSBAND,

    // Paternal Grand Father
    [`${Relation.PATERNAL_GRANDFATHER}|${Relation.SON}`]: Relation.PATERNAL_UNCLE,
    [`${Relation.PATERNAL_GRANDFATHER}|${Relation.DAUGHTER}`]: Relation.PATERNAL_AUNT,
    [`${Relation.PATERNAL_GRANDFATHER}|${Relation.BROTHER}`]: Relation.PATERNAL_GRANDFATHER,
    [`${Relation.PATERNAL_GRANDFATHER}|${Relation.WIFE}`]: Relation.PATERNAL_GRANDMOTHER,
    [`${Relation.PATERNAL_GRANDFATHER}|${Relation.SISTER}`]: Relation.PATERNAL_GRANDMOTHER,
    [`${Relation.PATERNAL_GRANDFATHER}|${Relation.MOTHER}`]: Relation.GREAT_GRANDMOTHER,
    [`${Relation.PATERNAL_GRANDFATHER}|${Relation.FATHER}`]: Relation.GREAT_GRANDMOTHER,

    // Paternal Grand Mother
    [`${Relation.PATERNAL_GRANDMOTHER}|${Relation.SON}`]: Relation.PATERNAL_UNCLE,
    [`${Relation.PATERNAL_GRANDMOTHER}|${Relation.DAUGHTER}`]: Relation.PATERNAL_AUNT,
    [`${Relation.PATERNAL_GRANDMOTHER}|${Relation.BROTHER}`]: Relation.PATERNAL_GRANDFATHER,
    [`${Relation.PATERNAL_GRANDMOTHER}|${Relation.HUSBAND}`]: Relation.PATERNAL_GRANDFATHER,
    [`${Relation.PATERNAL_GRANDMOTHER}|${Relation.SISTER}`]: Relation.PATERNAL_GRANDMOTHER,
    [`${Relation.PATERNAL_GRANDMOTHER}|${Relation.MOTHER}`]: Relation.GREAT_GRANDMOTHER,
    [`${Relation.PATERNAL_GRANDMOTHER}|${Relation.FATHER}`]: Relation.GREAT_GRANDMOTHER,

    // Maternal Grand Father
    [`${Relation.MATERNAL_GRANDFATHER}|${Relation.SON}`]: Relation.MATERNAL_UNCLE,
    [`${Relation.MATERNAL_GRANDFATHER}|${Relation.DAUGHTER}`]: Relation.MATERNAL_AUNT,
    [`${Relation.MATERNAL_GRANDFATHER}|${Relation.BROTHER}`]: Relation.MATERNAL_GRANDFATHER,
    [`${Relation.MATERNAL_GRANDFATHER}|${Relation.WIFE}`]: Relation.MATERNAL_GRANDMOTHER,
    [`${Relation.MATERNAL_GRANDFATHER}|${Relation.SISTER}`]: Relation.MATERNAL_GRANDMOTHER,
    [`${Relation.MATERNAL_GRANDFATHER}|${Relation.MOTHER}`]: Relation.GREAT_GRANDMOTHER,
    [`${Relation.MATERNAL_GRANDFATHER}|${Relation.FATHER}`]: Relation.GREAT_GRANDMOTHER,

    // Maternal Grand Mother
    [`${Relation.MATERNAL_GRANDMOTHER}|${Relation.SON}`]: Relation.MATERNAL_UNCLE,
    [`${Relation.MATERNAL_GRANDMOTHER}|${Relation.DAUGHTER}`]: Relation.MATERNAL_AUNT,
    [`${Relation.MATERNAL_GRANDMOTHER}|${Relation.BROTHER}`]: Relation.MATERNAL_GRANDFATHER,
    [`${Relation.MATERNAL_GRANDMOTHER}|${Relation.HUSBAND}`]: Relation.MATERNAL_GRANDFATHER,
    [`${Relation.MATERNAL_GRANDMOTHER}|${Relation.SISTER}`]: Relation.MATERNAL_GRANDMOTHER,
    [`${Relation.MATERNAL_GRANDMOTHER}|${Relation.MOTHER}`]: Relation.GREAT_GRANDMOTHER,
    [`${Relation.MATERNAL_GRANDMOTHER}|${Relation.FATHER}`]: Relation.GREAT_GRANDMOTHER,
};

export const findRelation = (path: string) => {
    const steps = path.split(" -> ");
    let state = Relation.SELF;
    for(const step of steps) {
        const key = `${state}|${step.toLowerCase()}` as keyof typeof TRANSITIONS;
        if(!TRANSITIONS[key]) throw new Error("No Relation");
        state = TRANSITIONS[key];
    }
    if(!TELUGU_NAMES[state]) throw new Error("No Telugu name");
    return TELUGU_NAMES[state];
}

