var fs = require('fs'),
    path = require('path'),
    dTree = require('directory-tree'),
    midiConv = require('midiconvert'),
    instrParser = require('midi-file-parser'),
    bodyParser = require('body-parser'),
    Q = require('q'),
    fsp = Q.denodeify(fs.readFile),
    MIDI = require('midijs'),
    chalk = require('chalk'),
    instrs = ["acoustic grand", "bright acoustic", "electric grand", "honky-tonk", "electric piano 1", "electric piano 2", "harpsichord", "clav", "celesta", "glockenspiel", "music box", "vibraphone", "marimba", "xylophone", "tubular bells", "dulcimer", "drawbar organ", "percussive organ", "rock organ", "church organ", "reed organ", "accordion", "harmonica", "tango accordion", "acoustic guitar(nylon)", "acoustic guitar(steel)", "electric guitar(jazz)", "electric guitar(clean)", "electric guitar(muted)", "overdriven guitar", "distortion guitar", "guitar harmonics", "acoustic bass", "electric bass(finger)", "electric bass(pick)", "fretless bass", "slap bass 1", "slap bass 2", "synth bass 1", "synth bass 2", "violin", "viola", "cello", "contrabass", "tremolo strings", "pizzicato strings", "orchestral harp", "timpani", "string ensemble 1", "string ensemble 2", "synthstrings 1", "synthstrings 2", "choir aahs", "voice oohs", "synth voice", "orchestra hit", "trumpet", "trombone", "tuba", "muted trumpet", "french horn", "brass section", "synthbrass 1", "synthbrass 2", "soprano sax", "alto sax", "tenor sax", "baritone sax", "oboe", "english horn", "bassoon", "clarinet", "piccolo", "flute", "recorder", "pan flute", "blown bottle", "shakuhachi", "whistle", "ocarina", "lead 1 (square)", "lead 2 (sawtooth)", "lead 3 (calliope)", "lead 4 (chiff)", "lead 5 (charang)", "lead 6 (voice)", "lead 7 (fifths)", "lead 8 (bass+lead)", "pad 1 (new age)", "pad 2 (warm)", "pad 3 (polysynth)", "pad 4 (choir)", "pad 5 (bowed)", "pad 6 (metallic)", "pad 7 (halo)", "pad 8 (sweep)", "fx 1 (rain)", "fx 2 (soundtrack)", "fx 3 (crystal)", "fx 4 (atmosphere)", "fx 5 (brightness)", "fx 6 (goblins)", "fx 7 (echoes)", "fx 8 (sci-fi)", "sitar", "banjo", "shamisen", "koto", "kalimba", "bagpipe", "fiddle", "shanai", "tinkle bell", "agogo", "steel drums", "woodblock", "taiko drum", "melodic tom", "synth drum", "reverse cymbal", "guitar fret noise", "breath noise", "seashore", "bird tweet", "telephone ring", "helicopter", "applause", "gunshot"],
    markObj = {}, //the markov object! Oboy!
    songInstrArr = [],
    File = MIDI.File;

var markParser = function(tracks) {
    var dups = false;
    for (var trk in tracks) {
        if (tracks.hasOwnProperty(trk)) {
            if (!markObj[trk]) markObj[trk] = {}; //if there's not already a sub-object for this instrument, create it.
            console.log('TRACK SAMPLE', trk, tracks[trk][3])
            for (var i = 0; i < tracks[trk].length; i++) {
                if (!markObj[trk][tracks[trk][i]]) {
                    //note (and its followers) not already recorded. Make new obj
                    markObj[trk][tracks[trk][i]] = {

                    };
                }
                //now look at its follower (if any!)
                if (tracks[trk][i] && tracks[trk][i + 1]) {
                    if (!markObj[trk][tracks[trk][i]][tracks[trk][i + 1]]) {
                        markObj[trk][tracks[trk][i]][tracks[trk][i + 1]] = 1;
                    } else {
                        markObj[trk][tracks[trk][i]][tracks[trk][i + 1]]++;
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
                    console.log('tryin to get new seed for', trk, Object.keys(m[trk]))
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
            console.log('generated notes for', trk, '. Length:', newNotes[trk].length)
        }
    }
    return newNotes;
}

var baseUrl = './data/classicalPiano/';
var parseNotes = function(songList, who, res, allLen) {
    var instrObj = {},
        foundTracks = false;
    songsDone = 0;
    songList.forEach((s) => {
        var tracks = s.getTracks();
        var trakNum = 0;
        for (var i = 0; i < tracks.length; i++) {
            //find the event with the instrument num
            for (var j = 0; j < tracks[i]._events.length; j++) {
                if (tracks[i]._events[j].type == 12 && (tracks[i]._events[j].program || tracks[i]._events[j].program == 0)) {
                    trakNum = tracks[i]._events[j].program;
                }
            }
            if (tracks[i].getEvents().filter((x) => {
                    return x.note && x.type
                }).length) {
                console.log('Track\'s instrument', instrs[trakNum], 'num', trakNum);
                //this track is (most likely) an instrument! 
                foundTracks = true;
                if (!instrObj[instrs[trakNum]]) instrObj[instrs[trakNum]] = [];
                var trackEvents = tracks[i].getEvents().filter(function(ev) {
                    return ev.type == 9 || ev.type == 8;
                }).sort(function(a, b) {
                    return a.delay - b.delay;
                });
                for (var s = 0; s < trackEvents.length; s++) {
                    if (trackEvents[s].velocity > 0 && trackEvents[s].type == 9) {
                        //noteOn event
                        for (var e = s; e < trackEvents.length; e++) {
                            if (trackEvents[e].note == trackEvents[s].note && trackEvents[e].delay - trackEvents[s].delay > 50 && (trackEvents[e].type == 8 || (trackEvents[e].type == 9 && trackEvents[e].velocity == 0))) {
                                // throw new Error('Notes:s '+JSON.stringify(trackEvents[s])+'e: '+JSON.stringify(trackEvents[e]))
                                //found the end note. End notes are either type==8, or type == 9 and velocity (volume) == 0.
                                //we're limiting minimum note duration to 50ms 
                                //note_startTime_duration
                                var actualStart = parseInt(trackEvents[s].delay / (4 * (11 - res))) * (4 * (11 - res));
                                var actualDuration = parseInt((trackEvents[e].delay - trackEvents[s].delay) / (11 - res)) * (11 - res);
                                actualStart = trackEvents[s].delay;
                                actualDuration = trackEvents[e].delay - trackEvents[s].delay;
                                // if (actualDuration < 10) throw Error('Extremely short note!' + JSON.stringify(trackEvents[s]) + JSON.stringify(trackEvents[e]))
                                var oneNote = trackEvents[s].note + '_' + actualStart + '_' + actualDuration;
                                instrObj[instrs[trakNum]].push(oneNote);
                                // if (actualStart>1) throw new Error ('Found a start greater than 1!'+instrObj[instrs[trakNum]][instrObj[instrs[trakNum]].length-1])
                                break;
                            }
                        }
                    }
                }
            }
        }
    });
    if (!foundTracks) {
        console.log(chalk.red('WARNING:') + 'No instrument tracks found! The resulting MIDI file may have no data!')
    }
    // throw new Error(JSON.stringify(instrObj))
    //now pass into markov obj generator!
    console.log("BEFORE MARKOV ANA")
    markParser(instrObj);
    //generate Markov!
    console.log("BEFORE GENMARK")
    var newNotes = genMark(markObj, allLen);
    //now MIDI stuffs!

    var theMidi = new MIDI.File();
    var currTrkInstr = 'STUFF';
    for (var trk in newNotes) {
        if (newNotes.hasOwnProperty(trk)) {
            if (trk != currTrkInstr) {
                theMidi.addTrack(theMidi._tracks.length, new File.ChannelEvent(File.ChannelEvent.TYPE.PROGRAM_CHANGE, {
                    program: MIDI.gm.getProgram(trk)
                }, 0, 0));
                currTrkInstr = trk;
            }
            for (var n = 0; n < newNotes[trk].length; n++) {
                var newNoteAdd = newNotes[trk][n].split('_'),
                    startNote = new File.ChannelEvent(File.ChannelEvent.TYPE.NOTE_ON, {
                        note: parseInt(newNoteAdd[0])
                    }, (theMidi._tracks.length - 1), parseInt(newNoteAdd[1])),
                    endNote = new File.ChannelEvent(File.ChannelEvent.TYPE.NOTE_OFF, {
                        note: parseInt(newNoteAdd[0])
                    }, theMidi._tracks.length - 1, parseInt(newNoteAdd[1]));
                startNote.delay = parseInt(newNoteAdd[1]);
                endNote.delay = parseInt(newNoteAdd[1]) + parseInt(newNoteAdd[2]);
                theMidi._tracks[theMidi._tracks.length - 1].addEvent(theMidi._tracks[theMidi._tracks.length - 1]._events.length,
                    startNote
                );
                theMidi._tracks[theMidi._tracks.length - 1].addEvent(theMidi._tracks[theMidi._tracks.length - 1]._events.length,
                    endNote
                );
            }
            theMidi._tracks[theMidi._tracks.length - 1].addEvent(theMidi._tracks[theMidi._tracks.length - 1]._events.length, new File.MetaEvent(File.MetaEvent.TYPE.END_OF_TRACK));
        }
        // if (theMidi._tracks.length > 2) throw new Error('Stoppin after one trak!')
    }
    theMidi.getData(function(err, data) {
            if (err) throw err;
            fs.writeFile("fake_" + who + ".mid", data, function(err) {
                if (err) throw err;
            })
        })
        // var theMidi = midiConv.create();
        // //first, we add the 'title' track.
        // theMidi.track("Markov Does " + who);
        // var trackInstrs = [null];
        // for (var trk in newNotes) {
        //     if (newNotes.hasOwnProperty(trk)) {
        //         var trak = "theMidi.track(\'" + trk + "\')";
        //         for (var n = 0; n < newNotes[trk].length; n++) {
        //             // console.log(typeof newNotes[trk][n],newNotes[trk][n])
        //             trak += '.note\(' + newNotes[trk][n].split('_')[0] + "," + newNotes[trk][n].split('_')[1] + "," + newNotes[trk][n].split('_')[2] + ",.6\)";
        //         }
        //         eval(trak); //eww, eval
        //         console.log('pushin', trk)
        //         trackInstrs.push(trk);
        //         //seein wat this does!
        //         theMidi.tracks[theMidi.tracks.length - 1].controlChanges = {
        //                 "7": [{
        //                     "number": 7,
        //                     "time": 0,
        //                     "value": 1
        //                 }],
        //                 "10": [{
        //                     "number": 10,
        //                     "time": 0,
        //                     "value": 0.5039370078740157
        //                 }]
        //             }
        //             //add instrument info! Tryin again!
        //     }
        // }
        // console.log(theMidi.encode, 'theMidi')
        // fs.writeFile("fake_" + who + ".mid", theMidi.encode(), "binary", function(err) {
        //     if (err) throw new Error('Error saving file!')
        //     fs.readFile("fake_" + who + ".mid", function(err, tomidijs) {
        //             var fileForTones = new MIDI.File(tomidijs, function(err) {
        //                 if (err) throw err;
        //             });
        //             var File = MIDI.File;
        //             var tracks = fileForTones.getTracks();
        //             tracks.forEach((trakTune, n) => {
        //                 if (trackInstrs[n]) {
        //                     console.log(trackInstrs[n])
        //                     fileForTones.getTracks(n).addEvent(0, // position (optional)
        //                         new File.ChannelEvent(File.ChannelEvent.TYPE.PROGRAM_CHANGE, {
        //                             program: MIDI.gm.getProgram(getInstrNumber(trackInstrs[n]))
        //                         }, 0, 0)
        //                     );
        //                 }
        //             })
        //         })
        //         // {"deltaTime":0,"channel":8,"type":"channel","subtype":"programChange","programNumber":53}
        // });
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
    console.log("OPTS", typeof opts, opts, opts.len)
    var songProms = [],
        songs = [],
        dir = './sampleMids/',
        res = 10,
        markLen = 200;
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
    }
    res = res > 10 ? 10 : res < 1 ? 1 : res; //cap res.
    //max rez: time:xx.x, dur:x.xxxx
    //min rez: time:x0.0, x.x

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
        songsRaw.forEach((s) => {
            songs.push(new MIDI.File(s, function(err) {
                if (err) throw err;
            }))
        })
        parseNotes(songs, artist, res, markLen)
    })

}
var getInstr = function(n) {
    return instrs[n] || 'None';
}
var getOneSong = function(addr) {
    return fsp(addr).then(function(s) {
        return JSON.stringify(new MIDI.File(s, function(err) {
            if (err) throw err;
        })._tracks);
    })
}

module.exports = {
    doSong: doSong,
    getInstr: getInstr,
    getSong: getOneSong
}
