#!/bin/node --max-old-space-size=8192

"use strict";

/* SHITCODE huh */

var log = console.log
var vmf = require('./vmf');
var fs = require('fs');
var hlib = require('./hammerlib');
var seed = require("./seedgenerator")
var seedrandom = require('seedrandom');
var argv = process.argv.slice(2)
const TILEMAP_LIMIT = parseInt(argv[0]) || 32;
seed = seed(argv[1])
log('Seed is ' + seed);
var debug = argv[2]
log('Debug: '+debug)

var random = seedrandom(seed);

var rules = [];

if (fs.existsSync('tiles/rules.js')) {
	rules = require('./tiles/rules');
} else {
	rules.handleTilePlacement = function() {
		return false
	};
	rules.customCordonBounds = [new hlib.Vector(-16376,-16376,-16376),new hlib.Vector(16376,16376,16376)]
}

const files = fs.readdirSync('tiles/').filter(function(file) {
	return !fs.statSync('tiles/' + file).isDirectory() && file.includes('.vmf');
});

var tiles_o = [];
var special_tiles_o = [];
var metatiles = [];

for (let filename of files) {
	log('Parsing ' + filename + ' with index ' + tiles_o.length);
	let { tiles,times } = vmf.parse('tiles/' + filename);
	if (filename.startsWith('post_')) {
		log(' *Post tile');
		tiles[3].onlyOnce();
		special_tiles_o.push(tiles[3]);
	} else if (filename.startsWith('once_')) {
		log(' *Once tile');
		tiles[3].onlyOnce();
		tiles_o.push(tiles[3]);
	} else if (filename.startsWith('meta_')) {
		metatiles = metatiles.concat(tiles);
		log(' *META TILE*');
	} else {
		if (times) {
			for (let i = 0; i < times; i++) {
				for (let tile of tiles){tiles_o.push(tile)};
			}
		} else {
			for (let tile of tiles){tiles_o.push(tile)};
		}
	}
}

if (tiles_o.length==0&&special_tiles_o.length==0){
	throw new Error("Well you didn't place any tiles into tiles folder what do you expect after that?")
}

function arrayKeys(array) {
	var keys = [];

	for (let i = 0; i < array.length; i++)
		if (array[i]){keys.push(keys.length)};

	return keys;
}

function arrayNumbersKeys(array) {
	var keys = [];

	for (let i in array)
		keys.push(Number(i))

	return keys;
}

function shuffleArray(array) {
	for (let i = array.length - 1; i > 0; i--) {
		let j = Math.floor(random() * (i + 1));
		let temp = array[i];
		array[i] = array[j];
		array[j] = temp;
	}
}

function getOppositeSide(side) {
	return 5 - side;
}

function planeToVector(side, bounds, planepos) {
	var size = bounds[1].subtract(bounds[0]);

	var center = bounds[0].add(size.multiply(0.5));

	var c1 = planepos[0] * vmf.TILESIZE;
	var c2 = planepos[1] * vmf.TILESIZE;

	switch (parseInt(side)) {
		case 0:
			return bounds[0].add(new hlib.Vector(c1, c2, size.z));
		case 1:
			return bounds[0].add(new hlib.Vector(c1, size.y, c2 / vmf.TILESIZE_ZMUL));
		case 2:
			return bounds[0].add(new hlib.Vector(0, c1, c2 / vmf.TILESIZE_ZMUL));
		case 3:
			return bounds[0].add(new hlib.Vector(size.x, c1, c2 / vmf.TILESIZE_ZMUL));
		case 4:
			return bounds[0].add(new hlib.Vector(c1, 0, c2 / vmf.TILESIZE_ZMUL));
		case 5:
			return bounds[0].add(new hlib.Vector(c1, c2, 0));
	}

}

var cordons = [];

function addToCordonTable(cordon) {
	cordons.push(cordon);
}

function checkCordonCollision(cordon) {
	var ocordon = rules.customCordonBounds
	if ((cordon[0].x > ocordon[1].x || cordon[1].x < ocordon[0].x) || (cordon[0].y > ocordon[1].y || cordon[1].y < ocordon[0].y) || (cordon[0].z > ocordon[1].z || cordon[1].z < ocordon[0].z)){
		return true
	}

	for (let i = 0; i < cordons.length; i++)
		if ((cordon[0].x < cordons[i][1].x && cordon[1].x > cordons[i][0].x) && (cordon[0].y < cordons[i][1].y && cordon[1].y > cordons[i][0].y) && (cordon[0].z < cordons[i][1].z && cordon[1].z > cordons[i][0].z)) {
			return true
		}

	return false;
}

var metatile;

var tilemap_num = 1;

var tileweb;

var curmaxid = 0


function tryAddTiles(tileset, prevtile, sides, center, cbounds, index) {

	var sidematrixes = prevtile.sidematrixes()
	var tskeys = arrayKeys(tileset);
	var tskeyslen = tskeys.length;

	let skeys = arrayNumbersKeys(sides);
	shuffleArray(skeys);

	for (let kskey = 0; kskey < skeys.length; kskey++) {
		var skey = skeys[kskey];
		if (!sides[skey]) {
			continue;
		}
		let matrix = sidematrixes[skey];

		let mkeys = arrayKeys(matrix);
		shuffleArray(mkeys);

		for (let mkey = 0; mkey < mkeys.length; mkey++) {
			let hole = matrix[mkeys[mkey]];
			let holesize = [hole[1][0] - hole[0][0], hole[1][1] - hole[0][1]];
			let holepos = planeToVector(skey, cbounds, [hole[0][0] + (holesize[0] / 2), hole[0][1] + (holesize[1] / 2)]);

			shuffleArray(tskeys);

			for (let tkey = 0; tkey < tskeyslen; tkey++) {
				let rindex = tskeys[tkey];
				let tile = tileset[rindex];
				let ctbounds = tile.cordonBounds();
				let tcenter = ctbounds[0].add(ctbounds[1].subtract(ctbounds[0]).multiply(0.5));
				let tsidematrixes = tile.sidematrixes();

				let tside = getOppositeSide(skey);
				let tmatrix = tsidematrixes[tside];

				if (!tmatrix.nonempty) {
					continue
				}

				let tmkeys = arrayKeys(tmatrix);
				shuffleArray(tmkeys);

				for (let tmkey = 0; tmkey < tmkeys.length; tmkey++) {
					let thole = tmatrix[tmkeys[tmkey]];

					let tholesize = [thole[1][0] - thole[0][0], thole[1][1] - thole[0][1]];

					if (!hole[2].some(r => thole[2].includes(r)) || holesize[0] != tholesize[0] || holesize[1] != tholesize[1]) {
						continue
					}

					ctbounds = tile.cordonBounds();

					let tholepos = planeToVector(tside, ctbounds, [thole[0][0] + (tholesize[0] / 2), thole[0][1] + (tholesize[1] / 2)]);
					let offset = holepos.subtract(tholepos);

					ctbounds[0] = ctbounds[0].add(offset);
					ctbounds[1] = ctbounds[1].add(offset);

					if (checkCordonCollision(ctbounds)) {
						continue
					}

					let tsides = tile.connectablesides();
					tsides[tside]--;

					if (rules.handleTilePlacement(tileweb, tileweb[index][1], tsides, prevtile, tile, offset.add(tcenter))) {
						continue
					}

					tilemap_num++;

					log('Connecting tile #' + tilemap_num + ' index:' + rindex);
					log(' ' + vmf.snames[skey] + ' <-> ' + vmf.snames[tside]);
					log(' Offset:' + offset);

					addToCordonTable(ctbounds);

					if (tile.once) {
						log('Removing once tile from set');
						tileset.splice(rindex, 1);
					}

					sides[skey]--;
					//if (sides[skey] <= 0) {
					//	delete tileweb[index][1][skey];
					//}

					tileweb.push([tile, tsides, tcenter, ctbounds, offset, tile.connectablesides()]);

					return true
				}
			}
		}
	}
}

var toremove = [];

function loopDoors() {
	toremove = [];
	for (var tkey in tileweb) {
		var tdata = tileweb[tkey]
		var sides = tdata[5];
		var sidematrixes = tdata[0].sidematrixes()

		let skeys = arrayNumbersKeys(sides);

		for (let kskey = 0; kskey < sides.length; kskey++) {
			let skey = skeys[kskey];
			if (!sides[skey] || sides[skey] <= 0) {
				continue;
			}
			let matrix = sidematrixes[skey];
			let side = skey;

			let mkeys = arrayKeys(matrix);
			let mkeyslen = mkeys.length;

			for (let mkey = 0; mkey < mkeyslen; mkey++) {
				let hole = matrix[mkeys[mkey]];
				let holesize = [hole[1][0] - hole[0][0], hole[1][1] - hole[0][1]];
				let holepos = planeToVector(side, tdata[3], [hole[0][0] + (holesize[0] / 2), hole[0][1] + (holesize[1] / 2)]);


				for (var otkey in tileweb) {
					if (otkey == tkey) {
						continue;
					}
					var otdata = tileweb[otkey];
					var osides = otdata[5];
					var osidematrixes = otdata[0].sidematrixes()

					let oskeys = arrayNumbersKeys(osides);

					for (let okskey = 0; okskey < osides.length; okskey++) {
						let oskey = oskeys[okskey]
						if (!osides[oskey] || osides[oskey] <= 0) {
							continue;
						}
						let omatrix = osidematrixes[oskey];
						let oside = oskey;

						let omkeys = arrayKeys(omatrix);
						let omkeyslen = omkeys.length;

						for (let omkey = 0; omkey < omkeyslen; omkey++) {
							//if (!sides[skey]) {
							//	continue;
							//}
							let ohole = omatrix[omkeys[omkey]];
							let oholesize = [ohole[1][0] - ohole[0][0], ohole[1][1] - ohole[0][1]];
							let oholepos = planeToVector(oside, otdata[3], [ohole[0][0] + (oholesize[0] / 2), ohole[0][1] + (oholesize[1] / 2)]);

							if (!hole[2].some(r => ohole[2].includes(r)) || holesize[0] != oholesize[0] || holesize[1] != oholesize[1]) {
								continue
							}

							if (holepos.distance(oholepos) > 1) {
								continue
							}

							sides[skey]--;
							//if (sides[skey] <= 0) {
								//tileweb[tkey][5].splice(skey, 1);
								//delete tileweb[tkey][6][skey];
								//if (sides.length==0){tileweb.splice(tkey, 1)};
							//}

							osides[oskey]--;

							//if (osides[oskey] <= 0) {
								//delete tileweb[otkey][6][oskey];
								//if (osides.length==0){tileweb.splice(otkey, 1)};
							//}

							log('Connecting tile doors of tiles ' + hole[3] + ' ' + tkey + '<==>' + otkey + ' ' + ohole[3]);

							if (!toremove[tkey]){toremove[tkey]=[]}
							var hkey = toremove[tkey].push([hole[3],true,skey,otkey])
							if (!toremove[otkey]){toremove[otkey]=[]}
							var ohkey = toremove[otkey].push([ohole[3],false,oskey,tkey,hkey-1])
							toremove[tkey][hkey-1][4] = ohkey-1
						}
					}
				}
			}
		}
	}
}

function removeTiles() { // Recursively removes tiles that doesn't obey restrictions
	var succ = true;
	while (succ) {
		succ = false;
		for (var tkey in tileweb) {
			var tdata = tileweb[tkey]
			var sides = tdata[5];
			var sideslen = sides.length;
			if (sideslen > 0) {
				var sidematrixes = tdata[0].sidematrixes()
				let skeys = arrayNumbersKeys(sides);
				for (let kskey = 0; kskey < sideslen; kskey++) {
					let skey = skeys[kskey]
					if (!sides[skey] || sides[skey] <= 0) {
						continue;
					}
					let matrix = sidematrixes[skey];

					let mkeys = arrayKeys(matrix);
					let mkeyslen = mkeys.length;

					for (let mkey = 0; mkey < mkeyslen; mkey++) {
						let hole = matrix[mkeys[mkey]];
						if (hole[4] == "1") {
							//console.log(sides[skey])
							//sides[skey]++;
							log("Unsatisfied connection deleting tile " + tkey + " " + tdata[0].type)
							succ = true;
							delete tileweb[tkey]
							for (let key in toremove[tkey]){let data=toremove[tkey][key];delete toremove[data[3]][data[4]];tileweb[data[3]][5][data[2]]++}
							delete toremove[tkey]
						}
					}
				}
			}
		}
	}
}

var tiles;
var special_tiles;
var second_tryhard = 0;

while (true){
	tiles = tiles_o.slice(0);
	special_tiles = special_tiles_o.slice(0);

	tileweb = [];
	cordons = [];

	var protometatile;

	if (metatiles.length != 0 ){
		protometatile = metatiles[Math.round(random() * (metatiles.length - 1))];
		log('Meta tile is ' + protometatile.type);
	} else {
		protometatile = Math.round(random() * (tiles_o.length - 1));
		for (let key in tiles_o) {
			if (key == protometatile) {
				protometatile = tiles_o[key];
				log('Meta tile is ' + tiles_o[key].type);
				break;
			}
		}
	}

	metatile = protometatile.deepcopy();
	addToCordonTable(metatile.cordonBounds());
	tileweb.push([metatile, metatile.connectablesides(), null, metatile.cordonBounds(), null, metatile.connectablesides()]);

	var cbounds = metatile.cordonBounds();
	var center = cbounds[0].add(cbounds[1].subtract(cbounds[0]).multiply(0.5));

	tilemap_num = 1;

	var succ = true;

	while (succ) {
		if (tiles.length == 0 || tilemap_num >= TILEMAP_LIMIT) {
			break
		}
		succ = false;
		let twkeys = arrayKeys(tileweb);
		shuffleArray(twkeys)

		for (let twkeykey = 0; twkeykey < tileweb.length; twkeykey++) {
			let twkey = twkeys[twkeykey];
			if (tryAddTiles(tiles, tileweb[twkey][0], tileweb[twkey][1], tileweb[twkey][2], tileweb[twkey][3], twkey)) {
				succ = true;
				break
			}
		}
	}

	if (tilemap_num < TILEMAP_LIMIT && tiles.length > 0) {
		log('First stage failed. Retrying...');
		continue
	}

	var succ = true;

	while (succ) {
		if (special_tiles.length == 0) {
			break
		}
		succ = false;
		let twkeys = arrayKeys(tileweb);
		shuffleArray(twkeys)

		for (let twkeykey = 0; twkeykey < tileweb.length; twkeykey++) {
			let twkey = twkeys[twkeykey];
			if (tryAddTiles(special_tiles, tileweb[twkey][0], tileweb[twkey][1], tileweb[twkey][2], tileweb[twkey][3], twkey)) {
				succ = true;
				break
			}
		}
	}

	
	if (special_tiles.length > 0&&second_tryhard<2) {
		//second_tryhard++;
		log('Second stage failed. Retrying in 1 second');
		//setTimeout(function() {
		//retry();
		//}, 50);
		continue
	} else if (second_tryhard>=2){log('WARNING:Second stage failed 2 times. You may need to add post_ tiles yourself');}
	

	loopDoors();
	removeTiles();

	log("Applying changes...")
	for (let key in tileweb) {
		let data = tileweb[key]
		let ctile;
		if (key == 0) {
			ctile = metatile;
		} else {
			ctile = data[0].deepcopy()
		}

		if (toremove[key]){
			for (let data of toremove[key]){
			if (!data){continue;}
			if (!data[1]){ctile.switchDoorVisGroup(data[0])};
			ctile.removePortalByID(data[0], data[1]);
			}
		}
		if (debug){ctile.tileDebug()}
		if (key == 0) {
			ctile.switchVisGroups(random);
			continue
		}
		//console.log("Ctile "+ctile.getMaximumID()+" MTile "+metatile.getMaximumID())
		metatile.addToID(ctile.getMaximumID())
		ctile.switchVisGroups(random);
		ctile.localizeTargetnames(key);
		ctile.recursiveTranslate(data[4]);
		metatile.merge(ctile);
	}

	finalize()
	break
}

function finalize(){

metatile.removeCordon()
metatile.unEntityPortals()

log("Writing to file")

fs.writeFileSync('combined.vmf', metatile.getCode())

}
