var express = require('express'),
    fs = require('fs'),
    path = require('path'),
    dTree = require('directory-tree'),
    midiFileParser = require('midi-file-parser'),
    parseMidi = require('midi-file').parseMidi,
    writeMidi = require('midi-file').writeMidi,
    bodyParser = require('body-parser'),
    Q = require('q');
var app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');

var noteMarkov = function(notes, oldMark) {
    var markObj;
    if (!oldMark) {
        markObj = {};
    } else {
        markObj = oldMark;
        console.log('USING OLD MARKOV OBJ')
    }
    //generate markov obj from each track.
    for (trk in notes) {
        if (notes.hasOwnProperty(trk)) {
            if (!oldMark) {
                markObj[trk] = {};
            }
            for (var i = 0; i < notes[trk].length; i++) {
                var thisStr = notes[trk][i].stringForm;
                if (!markObj[trk][thisStr]) {
                    markObj[trk][thisStr] = {}; //obj of pos notes following this;
                    if (oldMark) {
                        // console.log('NEW', thisStr, markObj[trk][thisStr])
                    }
                } else if (oldMark) {
                    // console.log('PREV', thisStr, markObj[trk][thisStr])
                }
                for (j = 0; j < notes[trk].length; j++) {
                    if (notes[trk][j].stringForm == thisStr && notes[trk][j + 1] && !markObj[trk][thisStr][notes[trk][j + 1].stringForm]) {
                        markObj[trk][thisStr][notes[trk][j + 1].stringForm] = 1;
                    } else if (notes[trk][j].stringForm == thisStr && notes[trk][j + 1]) {
                        markObj[trk][thisStr][notes[trk][j + 1].stringForm]++;
                    }
                }
            }
        }
    }
    if (oldMark) {
        // console.log(JSON.stringify(markObj), 'ALTERED MARK')
    }
    return markObj;
}
var gudBad = [0, 0]
var genMark = function(mark, len) {
    //for now, just generate a raw stringForm string
    var genNotes = {};
    if (!mark || typeof mark != 'object' || !len) {
        throw new Error('Wrong inputs!');
        return;
    }
    for (instr in mark) {
        if (mark.hasOwnProperty(instr)) {
            genNotes[instr] = [];
            //pick a random start seed
            var seedObj = Object.keys(mark[instr]),
                seed = seedObj[Math.floor(Math.random() * seedObj.length)];
            // console.log(`generating markov chain for ${instr} with start ${seed}`)
            for (var l = 0; l < len; l++) {
                genNotes[instr].push(seed);
                var isBad = false;
                var probArr = [];
                while (!mark[instr][seed]) {
                    //seed not found!
                    isBad = true;
                    seed = seedObj[Math.floor(Math.random() * seedObj.length)];
                }
                for (var fol in mark[instr][seed]) {
                    if (mark[instr][seed].hasOwnProperty(fol)) {
                        for (var q = 0; q < mark[instr][seed][fol]; q++) {
                            probArr.push(fol);
                        }
                    }
                }
                if (isBad) {
                    gudBad[1]++;
                } else {
                    gudBad[0]++;
                }
                //now got probability array of all followers and their likelyhood.
                seed = probArr[Math.floor(Math.random() * probArr.length)];
            }
        }
    }
    console.log('GOOD/BAD RATIO', gudBad)
    return genNotes;

}

var OneNote = function(timeStart, timeDelt, note, vel, prevNoteStart) {
    this.timeStart = timeStart;
    this.sinceLastNoteStart = prevNoteStart;
    this.timeDelt = timeDelt; //time since last event
    this.note = note; //note num
    this.velocity = vel; //not sure what this does
    this.stringForm = prevNoteStart + '_' + timeDelt + '_' + note;
    // this.stringForm = prevNoteStart+'_'+timeDelt+'_'+note+'_'+vel;
};
var noteObj = {};
var parseTrack = function(trk, instr) {
    if (!noteObj[instr]) noteObj[instr] = [];
    var timeElapsed = 0;
    trk.forEach((n, i) => {
        //go thru each item and get notes
        timeElapsed += n.deltaTime;
        if (n.type == 'noteOn') {
            var noteEnd = timeElapsed;
            for (var c = i; c < trk.length; c++) {
                noteEnd += trk[c].deltaTime;
                if (trk[c].type == 'noteOff' && trk[c].noteNumber == n.noteNumber) {
                    //found this note's off 
                    break;
                }
            }
            var lastNoteStart = noteObj[instr] && noteObj[instr].length ? timeElapsed - noteObj[instr][noteObj[instr].length - 1].timeStart : 0;
            noteObj[instr].push(new OneNote(timeElapsed, noteEnd - timeElapsed, n.noteNumber, n.velocity, lastNoteStart))
                // noteObj[instr].push(new OneNote(n.deltaTime, n.noteNumber, n.type, n.velocity))
        }
    });
}
var song;
var alterMidi = function(newStuff, song) {
    for (var trk in newStuff) {
        for (var i = 0; i < song.tracks.length; i++) {
            if (song.tracks[i][0].text == trk) {
                // console.log('FOUND ORIGINAL TRACK!!!')
                var allNotes = [];
                var noteStart = null; //where's the first note?
                var notesOn = {}; //which notes are on?
                var notesRemoved = 0;
                for (var j = 0; j < song.tracks[i].length; j++) {
                    //loop thru and remove notes!
                    if (song.tracks[i][j].type == 'noteOn' || song.tracks[i][j].type == 'noteOff') {
                        if (!noteStart) {
                            noteStart = j;
                        }
                        song.tracks[i].splice(j, 1);
                        notesRemoved++;
                        j--;
                    }
                }
                /*now we gotta go thru and generate new notes 
                to do this, we take the first item from newStuff[trk]. We push this note onto the notesOn obj. then we go 10 (ms?) at a time, and check at each time whether a new note should be added. Also subtract 10 at a time from each note on the notesOn obj, and see if any need to be turned off. keep track of total time elapsed. 
                */
                var firstNote = {
                    deltaTime: 0,
                    running: true,
                    channel: 0,
                    type: 'noteOn',
                    noteNumber: newStuff[trk][0].split('_')[2],
                    velocity: 47
                }
                allNotes.push(firstNote);
                var timeSinceLast = 0;
                notesOn[firstNote.noteNumber] = newStuff[trk][0].split('_')[1];
                newStuff[trk].shift();
                while (newStuff[trk].length) {
                    for (var note in notesOn) {
                        //note stops
                        if (notesOn[note]) {
                            notesOn[note] -= 10;
                            if (notesOn[note] <= 0) {
                                allNotes.push({
                                    deltaTime: timeSinceLast,
                                    running: true,
                                    channel: 0,
                                    type: 'noteOff',
                                    noteNumber: note,
                                    velocity: 0
                                })
                                timeSinceLast = 0;
                            }
                        }
                    }
                    //now, new notes
                    while (newStuff[trk].length && timeSinceLast >= newStuff[trk][0].split('_')[1]) {
                        // console.log('trk now', newStuff[trk])
                        allNotes.push({
                            deltaTime: timeSinceLast,
                            running: true,
                            channel: 0,
                            type: 'noteOn',
                            noteNumber: newStuff[trk][0].split('_')[2],
                            velocity: 47
                        })
                        newStuff[trk].shift();
                    }
                    timeSinceLast += 10;
                }
                // console.log(song.tracks[i],noteStart)
                var beforeNotes = song.tracks[i].slice(0, noteStart);
                var afterNotes = song.tracks[i].slice(noteStart);
                song.tracks[i] = beforeNotes.concat(allNotes).concat(afterNotes);
                // console.log('Song.tracks[i]', song.tracks[i])
                break;
            }
        }
    }
    return song;
};
/*
'native' format of midi json:
 { deltaTime: Number since previous event,
    running: Seems to always be 'true',
    channel: always zero?,
    type: is this a noteOn or noteOff event?,
    noteNumber: which note?,
    velocity: Volume? we can try just setting this to 47 for noteOn, and 0 for noteOff}
*/
var fsp = Q.denodeify(fs.readFile);
var baseUrl = './beethoven/'
var inFolder = dTree(baseUrl).children,
    songProms = [];
inFolder = inFolder.filter((s) => {
    return s.name.indexOf('format0') == -1;
})
inFolder.forEach((f) => {
    songProms.push(fsp(baseUrl + f.name))
})
Q.all(songProms).then((songs) => {
    var theMark = null,
        songsDone = 0,
        trackNames=[];
    songs.forEach((s, i) => {
        var song = parseMidi(s);
        noteObj = {};
        song.tracks.forEach((x) => {
            if (x[1].type == 'programChange' && x[0].type == 'trackName' && x[0].text != 'Pesdale') {
                x[0].text = x[0].text.toLowerCase();
                console.log('track for', x[0].text);
                parseTrack(x, x[0].text);
            }
        });
        // console.log(noteObj['Piano left']);
        // console.log('NUM NOTES PROBLY', Object.keys(noteObj['Piano left']).length)
        theMark = noteMarkov(noteObj, theMark);
        songsDone++;
        console.log(songsDone, 'songs of', songs.length, 'done. Next is', inFolder[songsDone].name)
    });
    // console.log('SONGS', songs)
    console.log('LINE 239')
        // newTracks = genMark(theMark, 50);
        // console.log('newTracks?', newTracks)
        // newSong = alterMidi(newTracks, songs[0]);
        // console.log('NEW SONG', newSong)
});
// fs.readFile('./data/classicalPiano/brahms/br_im2.mid', function(err, file) {
//     song = parseMidi(file);
//     trackNums = []
//     song.tracks.forEach((x, n) => {
//         if (x[1].type == 'programChange' && x[0].type == 'trackName') {
//             trackNums.push(n);
//             parseTrack(x, x[0].text);
//         }
//     })
//     var newTracks = genMark(noteMarkov(noteObj), 50);
//     // console.log(newTracks);
//     // console.log(song.tracks[trackNums[0]]);
//     //now we need to go thru the new strings and generate note objs from them
//     newSong = alterMidi(newTracks, song);
//     var output = writeMidi(newSong)
//     var outputBuffer = new Buffer(output)
//     fs.writeFileSync('newSong.mid', outputBuffer)
// });
// console.log(genMark(noteMarkov(noteObj), 50));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({
    extended: false,
    limit: '50mb'
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'bower_components')));
app.use(express.static(path.join(__dirname, 'node_modules')));
app.use(express.static(path.join(__dirname, 'views')));
// app.use('/', routes);


var http = require('http').Server(app);
//set port, or process.env if not local
http.listen(process.env.PORT || 9264);

app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500).send({
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500).send({
        message: err.message,
        error: {}
    });
});