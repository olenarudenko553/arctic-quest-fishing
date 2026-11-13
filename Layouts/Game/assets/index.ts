/* @app-slot:game */
export const bgGame = require('./bg_game.png');
export const buttonRect = require('./button_rect.png');
export const buttonRound = require('./button_round.png');
export const icon1024 = require('./icon_1024.png');
export const iconHome = require('./icon_home.png');
export const iconPause = require('./icon_pause.png');
export const logo = require('./logo.png');
export const sprite1 = require('./sprite_1.png');
export const sprite2 = require('./sprite_2.png');
export const sprite3 = require('./sprite_3.png');
export const sprite4 = require('./sprite_4.png');
export const sprite5 = require('./sprite_5.png');

/** The ONLY place that references the generated PNGs. */
export const assets = {
  bgGame,
  logo,
  iconHome,
  iconPause,
  buttonRect,
  buttonRound,
  sprite1,
  sprite2,
  sprite3,
  sprite4,
  sprite5,
};

/** sprite_1..sprite_5 in order - indexed by species id. */
export const SPRITES = [sprite1, sprite2, sprite3, sprite4, sprite5];

export default assets;
