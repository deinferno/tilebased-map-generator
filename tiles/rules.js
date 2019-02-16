"use strict";

(function() {

	var log = console.log

	function handleTilePlacement(tileweb,placedtiles,connections,tileconnections,basetile,tile,center){
		if (basetile.type==tile.type){return true}
		//if (connections.length-1+tileconnections.length<1){
			let count = 0
			for (let data of tileconnections){count=count+data[1]}
			for (let node of tileweb){
				for (let data of node[1]){count=count+data[1]}
			}
			if (count-1<=0){log('Sealing connection');return true}
		//}
	/*	
		if (tile.type=='post_hspawn_room.vmf'||tile.type=='post_zspawn_room.vmf'){
			for (let key in placedtiles){
				let ctile = placedtiles[key]
				if (ctile[0].type=='post_hspawn_room.vmf'||ctile[0].type=='post_zspawn_room.vmf'){
					if (ctile[1].subtract(center).abs().length()<1600){log('Too close to other spawn');return true}
					break
				}
			}
		}
	*/
	}


	module.exports.handleTilePlacement = handleTilePlacement
})()
