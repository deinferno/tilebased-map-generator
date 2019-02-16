"use strict";

/* SHITCODE huh */

var log = console.log
var vmf = require('./vmf');
var fs = require('fs');
var hlib = require('./hammerlib');
var seed = require("./seedgenerator")
var seedrandom = require('seedrandom');
var argv = process.argv.slice(2)
seed = seed(argv[0])
const TILEMAP_LIMIT = parseInt(argv[1]) || 16;
log('Seed is '+seed);
var random = seedrandom(seed);

var rules = [];

if (fs.existsSync('tiles/rules.js')) {
	rules = require('./tiles/rules');
} else {
	rules.handleTilePlacement = function() {
		return false
	};
}

const files = fs.readdirSync('tiles/').filter(function(file) {
	return !fs.statSync('tiles/'+file).isDirectory() && file.includes('.vmf');
	});

var protometatile;

var tiles_o = [];
var special_tiles_o = [];

for (let filename of files) {
	log('Parsing '+filename+' with index '+tiles_o.length);
	let tile = vmf.parse('tiles/'+filename);
	if (filename.startsWith('post_')) {
		log(' *Post tile');
		tile.onlyOnce();
		special_tiles_o.push(tile);
		continue;
	}
	if (filename.startsWith('meta_')) {
		protometatile=tile;
		log(' *META TILE*');
		continue;
	}
	tiles_o.push(tile);
}


if (!protometatile){
	protometatile = Math.round(random()*(tiles_o.length-1));
	for (let key in tiles_o) {
		if (key == protometatile) {
			protometatile=tiles_o[key];
			log('Meta tile is '+tiles_o[key].type);
			break;
		}
	}
}

function arrayKeys(array) {
	var keys = [];

	for (let i = 0; i < array.length; i++)
		if (array[i]){keys.push(keys.length)};

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

	switch(parseInt(side)){
		case 0:
			return bounds[0].add(new hlib.Vector(c1,c2,size.z));
		case 1:
			return bounds[0].add(new hlib.Vector(c1,size.y,c2));
		case 2:
			return bounds[0].add(new hlib.Vector(0,c1,c2));
		case 3:
			return bounds[0].add(new hlib.Vector(size.x,c1,c2));
		case 4:
			return bounds[0].add(new hlib.Vector(c1,0,c2));
		case 5:
			return bounds[0].add(new hlib.Vector(c1,c2,0));
	}

}

var cordons=[];

function addToCordonTable(cordon) {
cordons.push(cordon);
}

function checkCordonCollision(cordon) {
for (let i = 0; i < cordons.length; i++)
	if ((cordon[0].x < cordons[i][1].x && cordon[1].x > cordons[i][0].x) && (cordon[0].y < cordons[i][1].y && cordon[1].y > cordons[i][0].y) && (cordon[0].z < cordons[i][1].z && cordon[1].z > cordons[i][0].z)) {return true}

return false;
}

var metatile;

var angles = [180, 90, -90, 0];
const alength = 5
var tilemap_num = 1;

var tileweb;

var curmaxid = 0


function tryAddTiles(tileset, prevtile, sides, angle, center, cbounds, index){
	//var cbounds = prevtile.cordonBounds();

	shuffleArray(sides);

	var sideslen = sides.length;
	var sidematrixes = prevtile.sidematrixes(angle, center)

	for (let skey = 0; skey < sideslen; skey++){
		let matrix = sidematrixes[sides[skey][0]];
		let side = sides[skey][0];

		let mkeys = arrayKeys(matrix);
		let mkeyslen = mkeys.length;
		shuffleArray(mkeys);

		for (let mkey = 0; mkey < mkeyslen; mkey++){
			let hole = matrix[mkeys[mkey]];
			let holesize = [hole[1][0] - hole[0][0], hole[1][1] - hole[0][1]];
			let holepos = planeToVector(side, cbounds, [hole[0][0] + (holesize[0] / 2),hole[0][1] + (holesize[1] / 2)]);

			let tskeys = arrayKeys(tileset);
			let tskeyslen = tskeys.length;
			shuffleArray(tskeys);

			for (let tkey = 0; tkey < tskeyslen; tkey++){
				let rindex = tskeys[tkey];
				let tile = tileset[rindex];

				shuffleArray(angles);

				for (let akey = 0; akey < alength; akey++){
					let tangle = angles[akey];

					let ctbounds = tile.cordonBounds();
					let tcenter = ctbounds[0].add(ctbounds[1].subtract(ctbounds[0]).multiply(0.5));

					let tside = getOppositeSide(side);
					let tmatrix = tile.sidematrixes(tangle,tcenter)[tside];

					if (!tmatrix.nonempty){continue}
					
					let tmkeys = arrayKeys(tmatrix);
					let tmkeyslen = tmkeys.length;
					shuffleArray(tmkeys);

					for (let tmkey = 0; tmkey < tmkeyslen; tmkey++){
						let thole = tmatrix[tmkeys[tmkey]];

						let tholesize = [thole[1][0] - thole[0][0], thole[1][1] - thole[0][1]];

						if (!hole[2].some(r=> thole[2].includes(r)) || holesize[0] != tholesize[0] || holesize[1] != tholesize[1]){continue}

						ctbounds = tile.rotatedBounds(tangle,tcenter);

						let tholepos = planeToVector(tside, ctbounds, [thole[0][0] + (tholesize[0] / 2),thole[0][1] + (tholesize[1] / 2)]);
						let offset = holepos.subtract(tholepos);
	
						ctbounds[0]=ctbounds[0].add(offset);
						ctbounds[1]=ctbounds[1].add(offset);
	
						if (checkCordonCollision(ctbounds)){continue}
	
						let tsides = tile.connectablesides(tangle,tcenter);
						let tsideslength = tsides.length;
						for (let tskey = 0; tskey < tsideslength; tskey++)
							if (tsides[tskey][0] == tside){tsides[tskey][1]--;if (tsides[tskey][1]<=0){tsides.splice(tskey, 1)};break}	
	
						if (rules.handleTilePlacement(tileweb, placedtiles, tileweb[index][1], tsides, prevtile, tile, offset.add(tcenter))){continue}

						tilemap_num++;

						log('Connecting tile #'+tilemap_num+' index:'+rindex);
						log(' '+vmf.snames[side]+' <-> '+vmf.snames[tside]);
						log(' Offset:'+offset+' Rotation:'+tangle);

						addToCordonTable(ctbounds);

						// FULLY REMOVE ANY DEPENDENCE ON CLONING OBJECT, cache sidematrixes or idk
						// Add flags to portaldoors (!endpoint and stuff)

						let ctile = tile.deepcopy()
						prevtile.removePortalByID(hole[3],true);
						ctile.switchVisGroups(thole[3],random)
						ctile.removePortalByID(thole[3]);
						ctile.addToID(metatile.getMaximumID());
	
						if (ctile.once){
							log('Removing once tile from set');
							tileset.splice(rindex,1);
						}
	
						sides[skey][1]--;
						if (sides[skey][1]<=0){
							tileweb[index][1].splice(skey, 1);
							if (sides.length==0){tileweb.splice(index, 1)};
						}
						
						tileweb.push([ctile,tsides,tangle,tcenter,ctbounds]);
						placedtiles.push([ctile,tangle,tcenter,offset,hole[3]]);
	
						return true
					}

				}

			}

		}

	} 
}

var placedtiles;
var tiles;
var special_tiles;

function retry(){
tiles = tiles_o.slice(0);
special_tiles = special_tiles_o.slice(0);

tileweb = [];
placedtiles = [];
cordons = [];

metatile = protometatile.deepcopy();
metatile.switchVisGroups(null,random)
addToCordonTable(metatile.cordonBounds());
tileweb.push([metatile,metatile.connectablesides(),null,null,metatile.cordonBounds()]);

var cbounds = metatile.cordonBounds();
var center = cbounds[0].add(cbounds[1].subtract(cbounds[0]).multiply(0.5));
placedtiles.push([metatile,center]);

tilemap_num = 1;

var succ = true;

while (succ) {
if (tiles.length==0||tilemap_num>=TILEMAP_LIMIT) {break}
succ = false;
let tileweblen = tileweb.length;
shuffleArray(tileweb);

for (let twkey=0; twkey < tileweblen; twkey++)
	if (tryAddTiles(tiles,tileweb[twkey][0],tileweb[twkey][1],tileweb[twkey][2],tileweb[twkey][3],tileweb[twkey][4],twkey)){succ=true;break}

}

if (tilemap_num<TILEMAP_LIMIT&&tiles.length>0){log('First stage failed. Retrying...');retry();return}

while (succ) {
if (special_tiles.length==0) {break}
succ = false;
let tileweblen = tileweb.length;
shuffleArray(tileweb);

for (let twkey=0; twkey < tileweblen; twkey++)
	if (tryAddTiles(special_tiles,tileweb[twkey][0],tileweb[twkey][1],tileweb[twkey][2],tileweb[twkey][3],tileweb[twkey][4],twkey)){succ=true;break}

}

//if (special_tiles.length>0){log('Second stage failed. Retrying...');retry();return}

log("MERGING...")
for (let key in placedtiles){
	if (key==0){continue}
	let data = placedtiles[key]
	let ctile = data[0]
	console.log(ctile)
	ctile.recursiveRotate(data[1], data[2]);
	ctile.recursiveTranslate(data[3]);
	metatile.merge(ctile);
}

}

retry()

metatile.removeCordon()
metatile.unEntityPortals()

fs.writeFileSync('combined.vmf',metatile.getCode())
