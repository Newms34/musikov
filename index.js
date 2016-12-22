var fs = require('fs'),
    path = require('path'),
    dTree = require('directory-tree'),
    midiConv = require('midiconvert'),
    bodyParser = require('body-parser'),
    Q = require('q'),
    fsp = Q.denodeify(fs.readFile),
    chalk = require('chalk'),
    instrs = ['piano left', 'piano right', 'strings 1&2', 'strings viola', 'strings cello&bass', 'bassoon', 'trumpet', 'vocals', 'trombone', 'tympani', 'timpani', 'flute', 'oboe', 'clarinet', 'violin', 'viola', 'cello', 'double bass', 'Clarinetto', 'Fagotto', 'Corno', 'piano left2', 'piano right2']; //eventually, i'll use this to do ALL the musics.
var markObj = {}; //the markov object! Oboy!

var markParser = function(tracks) {
    for (var trk in tracks) {
        if (tracks.hasOwnProperty(trk)) {
            if (!markObj[trk]) markObj[trk] = {};
            for (var i = 0; i < tracks[trk].length; i++) {
                if (!markObj[trk][tracks[trk][i]['forMark']]) {
                    //note (and its followers) not already recorded. Make new obj
                    markObj[trk][tracks[trk][i]['forMark']] = {
                        actual: tracks[trk][i]['actual']
                    };
                }
                //now look at its follower (if any!)
                if (tracks[trk][i] && tracks[trk][i + 1]) {
                    if (!markObj[trk][tracks[trk][i]['forMark']][tracks[trk][i + 1]['forMark']]) {
                        markObj[trk][tracks[trk][i]['forMark']][tracks[trk][i + 1]['forMark']] = 1;
                    } else {
                        markObj[trk][tracks[trk][i]['forMark']][tracks[trk][i + 1]['forMark']]++;
                    }
                }
            }
        }
    }
    //made Markov obj!
}
var genMark = function(m, l) {
    var newNotes = {};
    for (var trk in m) {
        if (m.hasOwnProperty(trk)) {
            newNotes[trk] = [];
            var seed = Object.keys(m[trk])[Math.floor(Math.random() * Object.keys(m[trk]).length)]
            for (var i = 0; i < l; i++) {
                while (!m[trk][seed]) {
                    //while the seed doesnt exist, try to get a new one
                    seed = Object.keys(m[trk])[Math.floor(Math.random() * Object.keys(m[trk]).length)];
                }
                newNotes[trk].push(m[trk][seed]['actual'])
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
        }
    }
    return newNotes;
}

var baseUrl = './data/classicalPiano/';
var parseNotes = function(songList, who) {
    var instrObj = {},
        foundTracks = false,
        songsDone = 0;;
    songList.forEach((s) => {
        for (var i = 0; i < s.tracks.length; i++) {
            var trackStdized = s.tracks[i].name.toLowerCase().trim();
            if (s.tracks[i].name.toLowerCase().indexOf('\(') > -1) trackStdized = s.tracks[i].name.toLowerCase().slice(0, s.tracks[i].name.toLowerCase().lastIndexOf('\(')).trim();
            if (s.tracks[i].name == '' && s.tracks[i].notes && s.tracks[i].notes.length) {
                console.log(s.tracks[i],'NO NAME')
                trackStdized = 'piano left';
            }
            if (instrs.indexOf(trackStdized) > -1 || instrs.indexOf(trackStdized.slice(0, -1)) > -1) {
                trackStdized = trackStdized.slice(0, 1).toUpperCase() + trackStdized.slice(1);
                //this track is (most likely) an instrument!
                foundTracks = true;
                if (!instrObj[trackStdized]) instrObj[trackStdized] = [];
                //this is a relevant track! create note-time-dur markov elements
                s.tracks[i].notes.forEach((n) => {
                    instrObj[trackStdized].push({
                        actual: [n.midi, n.time, n.duration],
                        forMark: [n.midi, parseInt(n.time), parseInt(n.duration * 100) / 100].join('_')
                    }); //times are in SEC! 
                })
            }
        }
    });
    if (!foundTracks) {
        console.log(chalk.red('WARNING:') + 'No instrument tracks found! The resulting MIDI file may have no data!')
    }

    //now pass into markov obj generator!
    markParser(instrObj);
    //generate Markov!
    var newNotes = genMark(markObj, 200);
    //now MIDI stuffs!
    var theMidi = midiConv.create();
    for (var trk in newNotes) {
        if (newNotes.hasOwnProperty(trk)) {
            var trak = "theMidi.track(\'" + trk + "\')";
            for (var n = 0; n < newNotes[trk].length; n++) {
                trak += '.note\(' + newNotes[trk][n][0] + "," + newNotes[trk][n][1] + "," + newNotes[trk][n][2] + ",.6\)";
            }
            eval(trak); //eww, eval
        }
    }
    fs.writeFileSync("fake_" + who + ".mid", theMidi.encode(), "binary")
    console.log(chalk.green("Song") + " fake_" + who + ".mid " + chalk.green("done!"))
}
var doSong = function(artist, dir) {
    var songProms = [],
        songs = [];
    dir = dir || './sampleMids/';
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
            songProms.push(fsp(dir + artist + '/' + f.name, 'binary'));
        }
    })
    Q.all(songProms).done(function(songsRaw) {
        songsRaw.forEach((s) => {
            songs.push(midiConv.parse(s))
        })
        parseNotes(songs, artist)
    })

}

module.exports = {
    doSong: doSong
}
