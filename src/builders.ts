import { GAP_SYM, NEW_LINE_SYM } from './constants';
import { IWordsAnchors, IConfig, CharList, Align, Height } from './types';

function splitAndDuplicate(word: string, desiredLength: number) {
  // Split the word into an array of characters
  const chars = word.split('');

  // Initialize an empty array to store the duplicated arrays
  const result = [];

  // Loop until the concatenated arrays reach or exceed the desired length
  while (result.length < desiredLength) {
    // Concatenate the current array with the duplicatedArrays
    result.push(...chars);
  }

  // Trim the array to the desired length
  return result.slice(0, desiredLength);
}

const buildBlankCharList = (lineLen: number, filler: string): CharList => {
  return splitAndDuplicate(filler, lineLen);
};

const charListToString = (charList: CharList) => charList.join('');

const isEven = (num: number) => num % 2 === 0;

const getCenterAlignedAnchors = (words: string, charList: CharList): IWordsAnchors => {
  const smartRound =
    !isEven(words.length) && !isEven(charList.length) ? Math.floor : Math.ceil;
  const halfLen = smartRound(charList.length / 2);
  const halfWord = Math.floor(words.length / 2);
  const leftAnchor = halfLen - halfWord;
  const rightAnchor = leftAnchor + (words.length - 1);

  return { leftAnchor, rightAnchor };
};

const getLeftAlignedAnchors = (words: string, charList: CharList): IWordsAnchors => {
  let leftAnchor: number;
  let rightAnchor: number;

  for (const idx of Object.keys(charList)) {
    if (charList[idx] === GAP_SYM) {
      leftAnchor = Number(idx) + 1;
      break;
    }
  }

  rightAnchor = leftAnchor + (words.length - 1);

  return { leftAnchor, rightAnchor };
};

const getRightAlignedAnchors = (words: string, charList: CharList): IWordsAnchors => {
  let leftAnchor: number;
  let rightAnchor: number;

  const last = charList.length - 1;

  for (const idx of Object.keys(charList)) {
    if (charList[last - Number(idx)] === GAP_SYM) {
      rightAnchor = last - (Number(idx) + 1);
      break;
    }
  }

  leftAnchor = rightAnchor - (words.length - 1);

  return { leftAnchor, rightAnchor };
};

const getWordsAnchors = (
  align: Align,
  words: string,
  charList: CharList
): IWordsAnchors => {
  switch (align) {
    case 'center':
      return getCenterAlignedAnchors(words, charList);
    case 'left':
      return getLeftAlignedAnchors(words, charList);
    case 'right':
      return getRightAlignedAnchors(words, charList);
  }
};

// replaces char list with limiters if needed
export const withLimiters = (leftLim: string, rightLim: string) => (
  charList: CharList
): CharList => {
  const rightLimAnchor = charList.length - rightLim.length;

  return charList.map((char, i) => {
    // Insert left limiter
    if (i < leftLim.length) return leftLim[i];
    // Insert right limiter
    else if (i >= rightLimAnchor) return rightLim[i - rightLimAnchor];
    // Insert gaps after/before non-empty limiters
    else if (
      (leftLim.length && i === leftLim.length) ||
      (rightLim.length && i === rightLimAnchor - 1)
    )
      return GAP_SYM;
    // Pass other chars
    else return char;
  });
};

export const withWords = (align: Align, words: string) => (
  charList: CharList
): CharList => {
  const { leftAnchor, rightAnchor } = getWordsAnchors(align, words, charList);

  return charList.map((char, i) => {
    // Insert words
    if (i >= leftAnchor && i <= rightAnchor) return words[i - leftAnchor];
    // Insert gaps before/after words
    else if (i === leftAnchor - 1 || i === rightAnchor + 1) return GAP_SYM;
    // Pass other chars
    else return char;
  });
};

const composeInjectors = (...injectors) => (charList: CharList) =>
  injectors.reduce((res: CharList, injector) => injector(res), charList);

/**
 * Builder functions.
 */

// used for both solid line + subheader
export const buildSolidLine = (
  config: IConfig,
  leftIndent: string,
  sym: string
): string => {
  const injectLimiters = withLimiters(config.limiters.left, config.limiters.right);

  const blankCharList = buildBlankCharList(config.lineLen, sym);
  const computedCharList = composeInjectors(injectLimiters)(blankCharList);

  return leftIndent + charListToString(computedCharList);
};

// used for both header + subheader
export const buildWordsLine = (
  config: IConfig,
  transformedWords: string,
  leftIndent: string,
  sym: string
): string => {
  const injectLimiters = withLimiters(config.limiters.left, config.limiters.right);
  const injectWords = withWords(config.align, transformedWords);

  const blankCharList = buildBlankCharList(config.lineLen, sym);
  const computedCharList = composeInjectors(injectLimiters, injectWords)(blankCharList);

  return leftIndent + charListToString(computedCharList);
};

export const buildBlock = (
  config: IConfig,
  transformedWords: string,
  leftIndent: string
): string => {
  const textConfig: IConfig = { ...config, topSym: GAP_SYM };
  const topLine = buildSolidLine(config, leftIndent, config.topSym);
  const textLine = buildWordsLine(
    textConfig,
    transformedWords,
    leftIndent,
    config.fillerSym
  );
  const bottomLine = buildSolidLine(config, leftIndent, config.bottomSym);

  return topLine + NEW_LINE_SYM + textLine + NEW_LINE_SYM + bottomLine;
};

export const BUILDERS_MAP: { [key in Height]: any } = {
  block: buildBlock,
  line: buildWordsLine
};
