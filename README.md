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

1. Install with `$npm install musikov --save`

2. Include it in your js with `var musikov = require('musikov');`

3. Finally, call it with `musikov.doSongs('mozart');`.

Note that Musikov does *not* return anything, other than a success or error message as appropriate.

###Parameters
The main function of Musikov, `doSongs()`, takes one required and one optional parameter as follows:

 - `artist`: Required. The name of the artist you wanna analyze. There *must* be a folder with this artist as its name in the current directory (or, if using the parameter below, in the directory specified below).
 - `directory`: Optional. If omitted, this will default to the included sample folder (`./sampleMids`), which contains one folder with songs by Sergei Vasilievich Rachmaninoff. 

So the correct format is: `musikov.doSongs('beethoven','./allMySongs/');

##Restrictions:
This is still a bit of a work in progress, and as such there are few notable restrictions on what kinda songs you can use.

1. You can, generally, only use piano music. Or, to be more accurate, only piano tracks are actually read. I'll change this eventually, but for now, get your Chopin on.
2. You may find instances of prolonged silence (i.e., no notes playing). I'm not *really* sure how to alleviate this problem, but for now, just fast-forward a bit.
3. Occasionally, the module crashes. If this happens, just restart your app, and run Musikov again. Since apparently turning things off and then on again is a valid debugging strategy.

##License:
 Eh, do whatever you want. Seriously. I give you permsission. 

##Credits:
 - I, [David Newman](https://github.com/Newms34), made this module. So any fault for broken stuff goes to me.
 - MidiConvert, which I use to both read and write the MIDI files, was created by [Gilles Piou](https://www.npmjs.com/~pioug). MidiConvert itself is a fork of [ToneJs's MidiConvert](https://github.com/Tonejs/MidiConvert), though Piou's version includes a lot of cool new stuff like actually writing MIDI files.
 - Directory tree parsing is provided by the aptly-named [directory-tree](https://www.npmjs.com/package/directory-tree) module, which converts directory structures to nice, easy JSON.
 - [Q](https://www.npmjs.com/package/q) and [Chalk](https://www.npmjs.com/package/chalk) from their respective creators too.