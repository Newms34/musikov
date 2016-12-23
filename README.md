#Musikov: A Musical Markov Experiment

##Contents:
 * [About](#About)
 * [Installation and Usage](#installation-and-usage)
 * [Restrictions](#restrictions)
 * [License](#license)
 * [Credits](#credits)

##About:
Run a Markov chain generator on MIDI files! Using simple Markov analysis, generate samples in the style of your favorite artist.

##Installation and Usage:
###General Usage

Usage is pretty simple. Just:

1. Install with `$npm install Musikov --save`

2. Include it in your js with `var Musikov = require('Musikov');`

3. Finally, call it with `Musikov.doSongs('mozart');`.

Note that Musikov does *not* return anything, other than a success or error message as appropriate.

###Parameters
The main function of Musikov, `doSongs()`, takes one required and one optional parameter as follows:

 - `artist`: Required. The name of the artist you wanna analyze. There *must* be a folder with this artist as its name in the current directory (or, if using the parameter below, in the directory specified below).
 - `options`: Optional. This optional options object (try saying *that* three times fast!) itself includes a bunch of options:

  - `dir`: Parent directory of the midi files. Useful if you wanna run Musikov on some far-away MIDI files. Defaults to `./sampleMids/`, which is a folder of works by Sergei Rachmaninoff.
  - `res`: Resolution of the sampling. The default is max resolution, but if your sample's too small (or too random!), lowering the same may help. Minimum of 1, maximum of 10, and default of 10.
  - `len`: Length of the resultant song, in number of notes (*not* duration!). Defaults to 200. 

So the correct format is: 

```Musikov.doSongs('beethoven',{
dir:'./allMySongs/',
res:5,
len:150
}); ```

for a folder of songs by beethoven (presumably), in a directory allSongs, with a resolution of 5 and a length of 150 notes. Note that the parameters above can be included in any order, so `doSongs({res:2},'mozart')` works too.

##Restrictions:
This is still a work in progress, and as such there are few notable restrictions on what kinda songs you can use.

1. For some reason, instruments other than piano seem to work rarely, if ever. This partially has to do with how the module interprets tracks for which it can't determine the instrument. I'll fix this eventually, but for now, get your Chopin on.
2. You may find instances of prolonged silence (i.e., no notes playing). I'm not *really* sure how to alleviate this problem, but for now, just fast-forward a bit.
3. Occasionally, the module crashes. If this happens, just restart your app, and run Musikov again. Since apparently turning things off and then on again is a valid debugging strategy.

##License:
 Eh, do whatever you want. Seriously. I give you permsission. 

##Credits:
 - I, [David Newman](https://github.com/Newms34), made this module. So any fault for broken stuff goes to me.
 - MidiConvert, which I use to both read and write the MIDI files, was created by [Gilles Piou](https://www.npmjs.com/~pioug). MidiConvert itself is a fork of [ToneJs's MidiConvert](https://github.com/Tonejs/MidiConvert), though Piou's version includes a lot of cool new stuff like actually writing MIDI files.
 - Directory tree parsing is provided by the aptly-named [directory-tree](https://www.npmjs.com/package/directory-tree) module, which converts directory structures to nice, easy JSON.
 - [Q](https://www.npmjs.com/package/q) and [Chalk](https://www.npmjs.com/package/chalk) from their respective creators too.