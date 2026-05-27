/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlatformPreset, TrimPreset, PlatformId, TrimSizeId } from '../types';

export const PLATFORMS: Record<PlatformId, PlatformPreset> = {
  kdp: {
    id: 'kdp',
    name: 'Amazon KDP',
    minPages: 24,
    spineFormula: {
      white: 0.002500, // pages * 0.0025"
      cream: 0.002347, // pages * 0.002347"
      color: 0.002500, // pages * 0.002500"
    },
    getMargins: (pageCount: number) => {
      if (pageCount <= 150) {
        return { inside: 0.375, outside: 0.25, top: 0.25, bottom: 0.25 };
      } else if (pageCount <= 400) {
        return { inside: 0.500, outside: 0.25, top: 0.25, bottom: 0.25 };
      } else if (pageCount <= 600) {
        return { inside: 0.625, outside: 0.25, top: 0.25, bottom: 0.25 };
      } else {
        return { inside: 0.750, outside: 0.25, top: 0.25, bottom: 0.25 };
      }
    }
  },
  ingram: {
    id: 'ingram',
    name: 'IngramSpark',
    minPages: 24,
    spineFormula: {
      white: 0.002252, // pages * 0.002252"
      cream: 0.002121, // pages * 0.002121"
      color: 0.002252,
    },
    getMargins: () => ({
      inside: 0.500,
      outside: 0.375,
      top: 0.500,
      bottom: 0.500
    })
  },
  lulu: {
    id: 'lulu',
    name: 'Lulu',
    minPages: 24,
    spineFormula: {
      white: 0.002300,
      cream: 0.002300,
      color: 0.002300
    },
    getMargins: () => ({
      inside: 0.500,
      outside: 0.375,
      top: 0.375,
      bottom: 0.375
    })
  },
  d2d: {
    id: 'd2d',
    name: 'Draft2Digital',
    minPages: 24,
    spineFormula: {
      white: 0.002400,
      cream: 0.002400,
      color: 0.002400
    },
    getMargins: () => ({
      inside: 0.500,
      outside: 0.375,
      top: 0.375,
      bottom: 0.375
    })
  }
};

export const TRIM_SIZES: TrimPreset[] = [
  { id: '5x8', name: '5" × 8"', width: 5.0, height: 8.0, commonUse: 'Fiction novel, romance, memoir' },
  { id: '5.25x8', name: '5.25" × 8"', width: 5.25, height: 8.0, commonUse: 'Fiction novel variant, sci-fi' },
  { id: '5.5x8.5', name: '5.5" × 8.5"', width: 5.5, height: 8.5, commonUse: 'Most popular standard paperback' },
  { id: '6x9', name: '6" × 9"', width: 6.0, height: 9.0, commonUse: 'Non-fiction standard, general trade' },
  { id: '6.14x9.21', name: '6.14" × 9.21"', width: 6.14, height: 9.21, commonUse: 'Non-fiction, professional trade (UK Royal)' },
  { id: '7x10', name: '7" × 10"', width: 7.0, height: 10.0, commonUse: 'Interactive workbook, textbook, manual' },
  { id: '8.5x11', name: '8.5" × 11"', width: 8.5, height: 11.0, commonUse: 'Workbook, coloring book, manual, journal' },
  { id: 'custom', name: 'Custom size', width: 6.0, height: 9.0, commonUse: 'Define your own specs' }
];

export const FONTS_LIST = [
  { id: 'eb-garamond', name: 'EB Garamond', fontStyle: 'serif', url: 'https://cdn.jsdelivr.net/npm/@openfonts/eb-garamond_all@1.44.2/files/eb-garamond-all-400.ttf' },
  { id: 'crimson-pro', name: 'Crimson Pro', fontStyle: 'serif', url: 'https://cdn.jsdelivr.net/npm/@openfonts/crimson-pro_all@1.44.2/files/crimson-pro-all-400.ttf' },
  { id: 'lora', name: 'Lora', fontStyle: 'serif', url: 'https://cdn.jsdelivr.net/npm/@openfonts/lora_all@1.44.2/files/lora-all-400.ttf' },
  { id: 'libre-baskerville', name: 'Libre Baskerville', fontStyle: 'serif', url: 'https://cdn.jsdelivr.net/npm/@openfonts/libre-baskerville_all@1.44.2/files/libre-baskerville-all-400.ttf' },
  { id: 'merriweather', name: 'Merriweather', fontStyle: 'serif', url: 'https://cdn.jsdelivr.net/npm/@openfonts/merriweather_all@1.44.2/files/merriweather-all-400.ttf' },
  { id: 'cormorant-garamond', name: 'Cormorant Garamond', fontStyle: 'serif', url: 'https://cdn.jsdelivr.net/npm/@openfonts/cormorant-garamond_all@1.44.2/files/cormorant-garamond-all-400.ttf' },
  { id: 'playfair-display', name: 'Playfair Display', fontStyle: 'serif', url: 'https://cdn.jsdelivr.net/npm/@openfonts/playfair-display_all@1.44.2/files/playfair-display-all-400.ttf' },
  { id: 'cardo', name: 'Cardo', fontStyle: 'serif', url: 'https://cdn.jsdelivr.net/npm/@openfonts/cardo_all@1.44.2/files/cardo-all-400.ttf' },
  { id: 'cinzel', name: 'Cinzel', fontStyle: 'serif', url: 'https://cdn.jsdelivr.net/npm/@openfonts/cinzel_all@1.44.2/files/cinzel-all-400.ttf' },
];

export const DEFAULT_BOOK_CONTENT = `Chapter 1: The Sparks of Creation

A cold wind was blowing over the furnace doors when the smith picked up his tongs. He had been shaping iron since before the Great Scarcity, back when coal was plentiful and the valleys of the north were not yet choked with ash. Now, every scrap of scrap, every discarded nail and rusted washer, was a prize worth fighting for. The bellows groaned a familiar, low complaint, sending up a shower of bright orange embers that danced toward the soot-stained rafters before winking out.

He leaned in close, his one good eye reflecting the molten orange center of the hearth. In that intense heat, the dark metal began to soften, its stubborn shape giving way to the steady, rhythmic blows of the heavy mallet. Clang. Clang. Clang. The sound echoed down the narrow, empty cobblestone street, a solitary beacon of industry in a world that had largely forgotten how to build.

Outside the heavy oak door of the smithy, the town was silent. Most people stayed inside their stone cottages, hoarding what dry firewood they had left or telling stories of the old days—when flying carriages crossed the oceans in mere hours and books were printed on thin slices of white birch in their millions, to be read once and thrown away. To the children of the settlement, such tales sounded like the magic of ancient forest-dwellers, no more real than giants or dragons.

Chapter 2: The Silent Assembly

By midday, three travelers had stalled their pack-beasts outside the low stone wall. Their robes were thick, trimmed with rough sheepskin and coated in the fine yellow dust of the dry high plains. They did not speak, but the leader, a tall woman with silver hair braided tight against her scalp, carried a leather satchel bound with three bronze buckles. She unclipped them one by one, her movements slow, deliberate, and practiced.

Inside the satchel lay a heavy sheaf of hand-written parchment. It was a manuscript, the culmination of seven years of hidden scribe work in the mountain monasteries of the far west. The ink was a dark walnut brown, mixed with fine charcoal to resist the fading touch of damp air and sunlight.

"The forge must receive this," she said, her voice dry and laced with the hard accents of the border country. "If we do not print these chapters now, the grammar of the old tongue will be lost forever. The next autumn will freeze our ink pots, and the frost will split the stone archives."

The smith wiped his brow with a greasy leather apron. He looked at the thick stack of sheets. "A book," he murmured. "It's been thirty years since I held a fresh one. Most are just damp pulp in the cellar ruins. You have the words, but do you have the sheepskins for the binding? Do you have the thread to sew the signatures?"

"We have our needles," she replied, "and the courage to press the plates."`;
