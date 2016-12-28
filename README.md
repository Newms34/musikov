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

Note that Musikov does *not* return anything, other than success or error messages as appropriate.

###Parameters
The main function of Musikov, `doSongs()`, takes one required and one optional parameter as follows:

 - `artist`: Required. The name of the artist you wanna analyze. There *must* be a folder with this artist as its name in the current directory (or, if using the parameter below, in the directory specified below).

 - `options`: Optional. This optional options object (try saying *that* three times fast!) itself includes a bunch of options (all of which, themselves, are optional):

  - `dir`: Parent directory of the midi files. Useful if you wanna run Musikov on some far-away MIDI files. Defaults to `./sampleMids/`, which is a folder of some assorted classical works.

  - `res`: Resolution of the sampling. Basically, a higher resolution (default) means that the actual, exact input values of parsed notes will be used. A lower value means that Musikov will round values somewhat. Minimum of 1, maximum of 10, and default of 10.

  - `len`: Length of the resultant song, in number of notes (*not* duration!). Defaults to 200. 

  - `shrink`: Occasionally, you may find that a particular artist tends to create very long MIDI files. Use this property to essentially divide the start time of each note by a value. Default here is 1 (real-time), and higher values will shorten the song.

  - `req`: For very complex midis, or groups of midis with more than 16 total instruments, Musikov can only include up to 16. Right now, it randomly picks instruments to include. However, if you really want your song to include particular instruments, you can include an array with those here as either:
  	- Instrument names (i.e.,`['church organ']`);
  	- Instrument number from the MIDI specification (i.e.,`['19']`); 

  - `grp`: Use this to treat groups of notes (anywhere from 1 to 10) as ONE markov item. This increases match accuracy, but also decreases number of matches. Best for really long samples.


So the correct format is: 

`Musikov.doSongs('beethoven',{
dir:'./allMySongs/',
res:5,
len:150,
shrink:2,
grp:3
});`

for a folder of songs by beethoven (presumably), in a directory allSongs, with a resolution of 5, a length of 150 notes, a shrink amount of 2, and a group size of 3. Note that the parameters above can be included in any order, so `doSongs({res:2},'mozart')` works too.

##Restrictions:
This is still a work in progress, and as such there are few notable restrictions the use of this app.

1. The particular version of the MIDI format I'm using can only handle a maximum of 16 instrument types at once. If you've got more than that, you'll either need to be okay with randomly-chosen instruments or include a `required` parameter as above.
2. You may find instances of prolonged silence (i.e., no notes playing). I'm not *really* sure how to alleviate this problem, but for now, just fast-forward a bit. Including a `shrink` parameter as described above can help.
3. Occasionally, the module crashes. If this happens, just restart your app, and run Musikov again. Since apparently turning things off and then on again is a valid debugging strategy.

##License:
 Eh, do whatever you want. Seriously. I give you permsission. 

##Credits:
 - I, [David Newman](https://github.com/Newms34), made this module. So any fault for broken stuff goes to me.
 - MidiConvert, which I use to read the MIDI files, was created by [Gilles Piou](https://www.npmjs.com/~pioug). MidiConvert itself is a fork of [ToneJs's MidiConvert](https://github.com/Tonejs/MidiConvert).
 - [jsmidgen](https://github.com/dingram/jsmidgen/), used to write the resulting MIDI files.
 - Directory tree parsing is provided by the aptly-named [directory-tree](https://www.npmjs.com/package/directory-tree) module, which converts directory structures to nice, easy JSON.
 - [Q](https://www.npmjs.com/package/q) and [Chalk](https://www.npmjs.com/package/chalk) from their respective creators too.