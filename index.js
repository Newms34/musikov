var fs = require('fs'),
    path = require('path'),
    dTree = require('directory-tree'),
    midiConv = require('./src/midiConv.js'),
    Q = require('q'),
    fsp = Q.denodeify(fs.readFile),
    MIDI = require('jsmidgen'),
    readline = require('readline'),
    chalk = require('chalk'),
    instrs = ["acoustic grand", "bright acoustic", "electric grand", "honky-tonk", "electric piano 1", "electric piano 2", "harpsichord", "clav", "celesta", "glockenspiel", "music box", "vibraphone", "marimba", "xylophone", "tubular bells", "dulcimer", "drawbar organ", "percussive organ", "rock organ", "church organ", "reed organ", "accordion", "harmonica", "tango accordion", "acoustic guitar(nylon)", "acoustic guitar(steel)", "electric guitar(jazz)", "electric guitar(clean)", "electric guitar(muted)", "overdriven guitar", "distortion guitar", "guitar harmonics", "acoustic bass", "electric bass(finger)", "electric bass(pick)", "fretless bass", "slap bass 1", "slap bass 2", "synth bass 1", "synth bass 2", "violin", "viola", "cello", "contrabass", "tremolo strings", "pizzicato strings", "orchestral harp", "timpani", "string ensemble 1", "string ensemble 2", "synthstrings 1", "synthstrings 2", "choir aahs", "voice oohs", "synth voice", "orchestra hit", "trumpet", "trombone", "tuba", "muted trumpet", "french horn", "brass section", "synthbrass 1", "synthbrass 2", "soprano sax", "alto sax", "tenor sax", "baritone sax", "oboe", "english horn", "bassoon", "clarinet", "piccolo", "flute", "recorder", "pan flute", "blown bottle", "shakuhachi", "whistle", "ocarina", "lead 1 (square)", "lead 2 (sawtooth)", "lead 3 (calliope)", "lead 4 (chiff)", "lead 5 (charang)", "lead 6 (voice)", "lead 7 (fifths)", "lead 8 (bass+lead)", "pad 1 (new age)", "pad 2 (warm)", "pad 3 (polysynth)", "pad 4 (choir)", "pad 5 (bowed)", "pad 6 (metallic)", "pad 7 (halo)", "pad 8 (sweep)", "fx 1 (rain)", "fx 2 (soundtrack)", "fx 3 (crystal)", "fx 4 (atmosphere)", "fx 5 (brightness)", "fx 6 (goblins)", "fx 7 (echoes)", "fx 8 (sci-fi)", "sitar", "banjo", "shamisen", "koto", "kalimba", "bagpipe", "fiddle", "shanai", "tinkle bell", "agogo", "steel drums", "woodblock", "taiko drum", "melodic tom", "synth drum", "reverse cymbal", "guitar fret noise", "breath noise", "seashore", "bird tweet", "telephone ring", "helicopter", "applause", "gunshot"],
    markObj = {}; //the markov object! Oboy!

var markParser = function(tracks, grp) {
    var dups = false;
    //grp is group size
    for (var trk in tracks) {
        if (tracks.hasOwnProperty(trk)) {
            if (!markObj[trk]) markObj[trk] = {}; //if there's not already a sub-object for this instrument, create it.
            for (var i = 0; i < tracks[trk].length; i += grp) {
                var thisNote = tracks[trk][i];
                //add grp notes
                for (var j = 0; j < grp - 1; j++) {
                    if (tracks[trk][i + j]) {
                        thisNote += '@' + tracks[trk][i + j];
                    }
                }
                if (!markObj[trk][thisNote]) {
                    //note (and its followers) not already recorded. Make new obj
                    markObj[trk][thisNote] = {

                    };
                }
                //now look at its follower (if any!)
                if (thisNote && tracks[trk][i + grp] && tracks[trk][i + grp + grp]) {
                    //construct fol note:
                    var folNote = tracks[trk][i + grp];
                    for (j = 0; j < grp; j++) {
                        if (tracks[trk][i + grp + j]) {
                            folNote += '@' + tracks[trk][i + grp + j];
                        }
                    }
                    if (!markObj[trk][thisNote][folNote]) {
                        markObj[trk][thisNote][folNote] = 1;
                    } else {
                        markObj[trk][thisNote][folNote]++;
                        dups = true;
                    }
                }
            }
        }
    }
    if (!dups) console.log(chalk.red('WARNING:') + ' No duplicate following nodes were detected. Markov generation may not work very well on this sample!\n' + chalk.blue('TIP:') + 'Try passing ' + chalk.cyan('doSong()') + ' an ' + chalk.cyan('options') + ' object with a lower ' + chalk.cyan('resolution') + ' parameter:' + chalk.cyan('musikov.doSong("myArtist",{res:1})'));
    //made Markov obj!
}

var genMark = function(m, l) {
    var newNotes = {};
    for (var trk in m) {
        if (m.hasOwnProperty(trk) && getInstrNumber(trk)) {
            newNotes[trk] = [];
            var seed = Object.keys(m[trk])[Math.floor(Math.random() * Object.keys(m[trk]).length)];
            for (var i = 0; i < l; i++) {
                while (!m[trk][seed]) {
                    //while the seed doesnt exist, try to get a new one
                    seed = Object.keys(m[trk])[Math.floor(Math.random() * Object.keys(m[trk]).length)];
                }
                newNotes[trk].push(seed)
                var probArr = []; //arr, probly. Shiver me timbers!
                for (fol in m[trk][seed]) {
                    if (m[trk][seed].hasOwnProperty(fol)) {
                        for (var j = 0; j < m[trk][seed][fol]; j++) {
                            probArr.push(fol);
                        }
                    }
                }
                seed = probArr[Math.floor(Math.random() * probArr.length)];
            }
            //now go thru and re-split notes
            newNotes[trk] = newNotes[trk].reduce((a, b) => {
                bArr = b.split('@');
                return a.concat(bArr)
            }, [])
        }
    }
    return newNotes;
}

var baseUrl = './data/classicalPiano/';
var parseNotes = function(songList, who, res, allLen, shrink, required, grp) {
    var instrObj = {},
        songsDone = 0;
    songList.forEach((s) => {
        var songNotes = midiConv.parse(s.toString('binary'), { duration: true }),
            instrNum = 0;
        for (var i = 0; i < songNotes.parts.length; i++) {
            var trk = instrs[songNotes.transport.instruments[i] - 1]; //instrument name
            if (!trk) {
                continue;
            }
            if (!instrObj[trk]) instrObj[trk] = [] //initiate an empty array for this instr if it has not already been created
                //now loop thru and create every note obj 
            var newTrkNotes = []; //this'll be concatted with the above obj
            for (var j = 0; j < songNotes.parts[i].length; j++) {
                var noteDur = parseInt(parseInt(songNotes.parts[i][j].duration) / (11 - res)) * (11 - res);
                var noteTime = parseInt(parseInt(songNotes.parts[i][j].time) / (10 * (11 - res))) * (10 * (11 - res)) / shrink;
                // if (isNaN(songNotes.parts[i][j].midiNote) || songNotes.parts[i][j].midiNote == 'NaN') {
                //     throw new Error('NOTE IS NOT A NUMBER(?!): ' + JSON.stringify(songNotes.parts[i][j]))
                // }else{
                //     console.log('OKay!',JSON.stringify(songNotes.parts[i][j]))
                // }
                if (!songNotes.parts[i][j].midiNote && songNotes.parts[i][j].midiNote !== 0) continue;
                newTrkNotes.push(songNotes.parts[i][j].midiNote + '_' + noteTime + '_' + noteDur);
            }
            newTrkNotes = newTrkNotes.sort((a, b) => {
                return parseInt(a.split('_')[1]) - parseInt(b.split('_')[1])
            });
            instrObj[trk] = instrObj[trk].concat(newTrkNotes);
        }
        songsDone++;
        readline.clearLine();
        console.log(`Finished analyzing song ${songsDone} of ${songList.length}`)
    });
    //now pass into markov obj generator!
    console.log("BEFORE MARKOV ANA")
    markParser(instrObj, grp);
    //generate Markov!
    console.log("BEFORE GENMARK")
    var newNotes = genMark(markObj, Math.ceil(allLen / grp));
    var theMidi = new MIDI.File(),
        numTracks = 0;
    var trakNames = Object.keys(newNotes);
    var inclTracks = [];
    console.log(required)
    while (numTracks < 15 && trakNames.length) {
        var whichTrak = null;
        if (required && required.length && trakNames.indexOf(required[0]) > -1) {
            whichTrak = trakNames.indexOf(required.shift());
        } else {
            whichTrak = Math.floor(Math.random() * trakNames.length);
        }
        var trak = trakNames[whichTrak],
            toEval = 'theMidi.addTrack()';
        inclTracks.push(trak);
        toEval += '.instrument(' + numTracks + ',0x' + instrs.indexOf(trak).toString(16) + ')'
        for (var i = 0; i < newNotes[trak].length; i++) {
            var oneNote = newNotes[trak][i].split('_');
            toEval += '.note(' + numTracks + ',"' + midiConv.MidiGen.Util.noteFromMidiPitch(parseInt(oneNote[0])) + '",' + parseInt(oneNote[2]) + ',' + parseInt(oneNote[1]) + ')'
        }
        trakNames.splice(whichTrak, 1); //remove this track!
        numTracks++;
        eval(toEval);
    }
    if (trakNames.length) {
        var noInst = trakNames.map(function(t) {
            return '\n' + chalk.red(' - ') + t;
        }).join('');
        var incInst = inclTracks.map(function(t) {
            return '\n' + chalk.green(' - ') + t;
        }).join('');
        console.log(chalk.red('WARNING:') + 'There were more instruments than the MIDI format can hold (max 16). The following instruments were included:\n' + incInst+'\nAnd the following were excluded: '+noInst)
    }
    fs.writeFileSync("fake_" + who + ".mid", theMidi.toBytes(), 'binary');
    console.log(chalk.green("Song") + " fake_" + who + ".mid " + chalk.green("created in ") + chalk.cyan(process.cwd()) + "!")
}
var getInstrNumber = function(targInstr) {
    for (var i = 0; i < instrs.length; i++) {
        if (targInstr.indexOf(instrs[i]) > -1) {
            return i;
        }
    }
    return false;
}

var doSong = function(artist, opts) {
    if (opts) console.log("OPTS", typeof opts, opts, opts.len)
    var songProms = [],
        songs = [],
        dir = './sampleMids/',
        res = 10,
        markLen = 200,
        shrink = 1
    req = [],
        grp = 1;
    //sort args
    if (typeof artist == 'object' && typeof opts == 'string') {
        var tempArg = opts;
        opts = artist;
        artist = tempArg;
    }
    if (opts) {
        if (opts.dir && typeof opts.dir == 'string') {
            dir = opts.dir;
        }
        if (opts.res && (typeof opts.res == 'number' && !isNaN(parseInt(opts.res)))) {
            res = parseInt(opts.res);
        }
        if (opts.len && (typeof opts.len == 'number' && !isNaN(parseInt(opts.len)))) {
            markLen = parseInt(opts.len);
        }
        if (opts.shrink && (typeof opts.shrink == 'number' && !isNaN(parseInt(opts.shrink)))) {
            shrink = opts.shrink;
        }
        if (opts.grp && (typeof opts.grp == 'number' && !isNaN(parseInt(opts.grp)))) {
            grp = opts.grp;
        }
        if (opts.req && req instanceof Array) {
            req = opts.req;
            req = req.map((r) => {
                if (parseInt(r).toString == r.toString() && parseInt(r) < instrs.length) {
                    return instrs[r];
                } else if (instrs.indexOf(r) > -1) {
                    return r;
                } else {
                    return null;
                }
            }).filter((f) => {
                return f
            });
        }
    }
    res = res > 10 ? 10 : res < 1 ? 1 : res;
    if (grp < 1) grp = 1;
    if (shrink < 1) shrink = 1;

    if (!artist) {
        throw new Error('You need to at least specify an artist!');
    }
    var fileTree = dTree(dir + artist + '/');
    if (!fileTree) {
        throw new Error('Could not find any MIDI files in ' + dir + artist + '!');
    }
    fileTree.children.forEach((f) => {
        if (f.name.indexOf('format0') < 0 && (f.extension == '.mid' || f.extension == '.midi')) {
            //valid file!
            songProms.push(fsp(dir + artist + '/' + f.name));
        }
    })
    Q.all(songProms).done(function(songsRaw) {
        parseNotes(songsRaw, artist, res, markLen, shrink, req, grp)
    })

}
var getInstr = function(n) {
    return instrs[n] || 'None';
}

module.exports = {
    doSong: doSong,
    getInstr: getInstr
}
