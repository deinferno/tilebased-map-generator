"use strict";

(function() {

	var log = console.log

	function handleTilePlacement(tileweb,connections,tileconnections,basetile,tile,center){
		//if (basetile.type==tile.type){return true}
		//if (connections.length-1+tileconnections.length<1){
			let count = 0
			for (let data of tileconnections){if (data){count=count+data}}
			for (let node of tileweb){
				for (let data of node[1]){;if (data){count=count+data}}
			}
			if (count-1<=0){log('Sealing connection');return true}
		//}
		//Uncomment to enable distance checking
		/*
		if (tile.type=='post_hspawn.vmf'||tile.type=='post_zspawn.vmf'){
			for (let key in tileweb){
				let ctile = tileweb[key]
				if (ctile[0].type=='post_hspawn.vmf'||ctile[0].type=='post_zspawn.vmf'){
					//if (ctile[2].add(ctile[3]).distance(center)<3000){log('Too close to other spawn');return true}
					break
				}
			}
		}
		*/
	}


	module.exports.handleTilePlacement = handleTilePlacement
})()
