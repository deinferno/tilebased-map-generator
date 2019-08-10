"use strict";

(function() {

	const TILESIZE = 32
	const DOOR_MIN_SIZE = 16

	var fs = require('fs')

	var hlib = require('./hammerlib')

	var extend = require('extend')

	var log = console.log

	//const OUTSIDE_MATERIAL = 'MATSYS_REGRESSIONTEST/BACKGROUND'

	const AREAPORTAL_MATERIAL = "TOOLS/TOOLSAREAPORTAL"

	const snames = ['TOP','NORTH','WEST','EAST','SOUTH','BOTTOM']

	var VMFUVMap = function(uvmap){
		var uv = uvmap.match(/([^ \[\]]+)/g)

		return new hlib.UVMap(parseFloat(uv[0]),parseFloat(uv[1]),parseFloat(uv[2]),parseFloat(uv[3]),parseFloat(uv[4]))
	}

	var VMFVector = function(vector) {
		var vec = vector.match(/([^ ()]+)/g)
		return new hlib.Vector(parseFloat(vec[0]),parseFloat(vec[1]),parseFloat(vec[2]),vector.search(/\(.*\)/) != -1)
	}

	var VMFPlane = function(vector) {
		var vec = vector.match(/([^ ()]+)/g)
		return [new hlib.Vector(parseFloat(vec[0]),parseFloat(vec[1]),parseFloat(vec[2]),true),new hlib.Vector(parseFloat(vec[3]),parseFloat(vec[4]),parseFloat(vec[5]),true),new hlib.Vector(parseFloat(vec[6]),parseFloat(vec[7]),parseFloat(vec[8]),true)]
	}

	var parse = function(file) {
		var contents=fs.readFileSync(file,'utf8')

		var lines = contents.split('\n')

		var filename = file.replace(/^.*[\\\/]/, '')

		var times =  filename.match(/.*_(\d+)\.vmf/)

		if (times){
			times = Number(times[1]);
		}

		var maproot = new VMFMap(filename)
		var currentobj = maproot 
		var prevline
		var parents = []

		for(let i = 0;i < lines.length;i++){
			if (prevline){
				let line = lines[i].trim()
    			if (line == '{'){
    				let obj
    				let type = prevline
					switch (type) {
						case 'solid':
					        obj = new VMFSolid(type)
					        break
						case 'side':
					        obj = new VMFSide(type)
					        break
					    case 'entity': case 'world':
					        obj = new VMFEntity(type)
					        break
					    default:
					        obj = new VMFObject(type)
					} 
    				parents.push(currentobj)
    				currentobj = obj
    			} else if (line == '}') {
    				let parent = parents.pop()
    				parent.addChild(currentobj)
    				currentobj = parent
    			} else {
    				let kv = line.match(/\"(.*?)\" \"(.*?)\"/)
    				if (kv && kv[1] && kv[2]) {currentobj.addProperty(kv[1],kv[2])}
    			}
    		}
    		prevline = lines[i].trim()
		}

		var cordmin = maproot.cordonBounds()[0]

		if (cordmin.x != 0 || cordmin.y != 0 || cordmin.y != 0 ){
			console.log('WARNING: Cordons mins are not 0')
		}

		var cordmax = maproot.cordonBounds()[1]

		var cordonsize = cordmin.abs().add(cordmax)

		if (cordonsize.x % TILESIZE != 0 || cordonsize.y % TILESIZE != 0 || cordonsize.z % TILESIZE != 0){
			console.log(cordonsize)
			console.log('Closest to tile size multiply')
			console.log(Math.floor(cordonsize.x/TILESIZE)*TILESIZE,Math.floor(cordonsize.y/TILESIZE)*TILESIZE,Math.floor(cordonsize.z/TILESIZE)*TILESIZE)
			console.log(Math.ceil(cordonsize.x/TILESIZE)*TILESIZE,Math.ceil(cordonsize.y/TILESIZE)*TILESIZE,Math.ceil(cordonsize.z/TILESIZE)*TILESIZE)
			throw new Error('Map doesn\'t have cordons that are multiple of '+TILESIZE+' ');
		}

		maproot.recursiveTranslate(maproot.cordonBounds()[0].multiply(-1))
		maproot.translateBounds(maproot.cordonBounds()[0].multiply(-1))
		maproot.removeCordonBrushes()

		var sm = maproot.sidematrixes()

		log(' *Sides ')

		var exist = false

		for (let i=0;i<=5;i++){
			if (sm[i].length>0){
			log('  '+sm[i].length+' portal(s) at '+snames[i]+' side')
			exist = true
			}
		}

		if (!exist){throw new Error('Map don\'t contain any connectable sides');}

		return {maproot:maproot,times:times}
	}

	class VMFObject {

		constructor(type) {
			this.type=type
			this.children = []
			this.prop = {}
		}

		addChild(obj){
			var type = obj.type
			if (!this.children[type]){this.children[type]=obj;return} else if (!Array.isArray(this.children[type])){this.children[type]=[this.children[type]]}
			this.children[type].push(obj)
		}

		addProperty(key,value) {
			this.prop[key]=value
		}

		getCode (strin,tabsin) {
			var str=strin ? strin : ''
			var tabs=(tabsin !== undefined ? tabsin : -1 )
			str+=(this.constructor.name == 'VMFMap' ? '' : '\n' + '\t'.repeat(tabs) + this.type + '\n' + '\t'.repeat(tabs) +'{')
			for (let key in this.prop) {
				str+= '\n' + '\t'.repeat(tabs+1) +'\"'+key+'\" \"'+this.prop[key]+'\"'
			}

			for (let key1 in this.children) {
				if (!Array.isArray(this.children[key1])){str=this.children[key1].getCode(str,tabs+1);continue}
				for (let key2 in this.children[key1]) {
					str=this.children[key1][key2].getCode(str,tabs+1)
				}
			}

			if (this.constructor.name != 'VMFMap' ) {str+='\n'+'\t'.repeat(tabs)+'}'}

			return str
		}

		findChildren(prev){
			prev = prev || [];

			prev.push(this)

			for (let key1 in this.children) {
				if (!Array.isArray(this.children[key1])){this.children[key1].findChildren(prev);continue}
				for (let key2 in this.children[key1]) {
					this.children[key1][key2].findChildren(prev)
				}
			}

			return prev
		}

		recursiveTranslate(vec){
			if (this.sidematrixes_cache){delete this.sidematrixes_cache}

			var origin = this.origin
			var plane = this.planes

			if (origin){this.prop.origin = origin.add(vec).toString()}
			if (plane&&Math.abs(plane[0].x)!=16376){this.prop.plane = plane[0].add(vec).toString()+' '+plane[1].add(vec).toString()+' '+plane[2].add(vec).toString()}

			for (let key1 in this.children) {
				if (!Array.isArray(this.children[key1])){this.children[key1].recursiveTranslate(vec);continue}
				for (let key2 in this.children[key1]) {
					this.children[key1][key2].recursiveTranslate(vec)
				}
			}

		}

		recursiveRotate(angle,center){
			if (this.sidematrixes_cache){delete this.sidematrixes_cache}

			var origin = this.origin
			var angles = this.angles
			var plane = this.planes
			var uvmap = this.UVMap

			if (origin){this.prop.origin = origin.subtract(center).rotateZ(angle).add(center).toString()}
			if (angles){angles.y+=angle;this.prop.angles = angles.toString()}
			if (plane){this.prop.plane = plane[0].subtract(center).rotateZ(angle).add(center).toString()+' '+plane[1].subtract(center).rotateZ(angle).add(center).toString()+' '+plane[2].subtract(center).rotateZ(angle).add(center).toString()}
			if (uvmap){

				var uaxis = uvmap[0].rotateZ(angle)
				var vaxis = uvmap[1].rotateZ(angle)

				this.prop.uaxis = uaxis.toString()
				this.prop.vaxis = vaxis.toString()
			}

			for (let key1 in this.children) {
				if (!Array.isArray(this.children[key1])){this.children[key1].recursiveRotate(angle,center);continue}
				for (let key2 in this.children[key1]) {
					this.children[key1][key2].recursiveRotate(angle,center)
				}
			}

		}

		translateBounds(offset){
			if (this.sidematrixes_cache){delete this.sidematrixes_cache}

			var mins = this.cordonMins.add(offset)
			var maxs = this.cordonMaxs.add(offset)

			this.cordon.prop.mins = new hlib.Vector(Math.min(mins.x,maxs.x),Math.min(mins.y,maxs.y),Math.min(mins.z,maxs.z),mins.sbrackets).toString()
			this.cordon.prop.maxs = new hlib.Vector(Math.max(mins.x,maxs.x),Math.max(mins.y,maxs.y),Math.max(mins.z,maxs.z),maxs.sbrackets).toString()
		}

		rotateBounds(angle,center){
			if (this.sidematrixes_cache){delete this.sidematrixes_cache}

			var mins = this.cordonMins.subtract(center).rotateZ(angle).add(center)
			var maxs = this.cordonMaxs.subtract(center).rotateZ(angle).add(center)

			this.cordon.prop.mins = new hlib.Vector(Math.min(mins.x,maxs.x),Math.min(mins.y,maxs.y),Math.min(mins.z,maxs.z),mins.sbrackets).toString()
			this.cordon.prop.maxs = new hlib.Vector(Math.max(mins.x,maxs.x),Math.max(mins.y,maxs.y),Math.max(mins.z,maxs.z),maxs.sbrackets).toString()
		}

		
		deepcopy() {		
			var obj = eval('new '+this.constructor.name+'()')				
			obj.type = this.type
			obj.children = []
			obj.prop = extend(true,[],this.prop)
			if(this.once){obj.once = this.once}
			for (let key1 in this.children) {
				if (!Array.isArray(this.children[key1])){obj.children[key1] = this.children[key1].deepcopy(obj);continue}
				obj.children[key1]=[]
				for (let key2 in this.children[key1]) {
					obj.children[key1][key2]=this.children[key1][key2].deepcopy(obj)
				}
			}

			return obj
		}
		
	}

	class VMFMap extends VMFObject {
		get name () {
			return this.type
		}

		get world () {
			return this.children.world
		}

		get entity () {
			return this.children.entity
		}

		get visgroups () {
			return this.children.visgroups
		}

		get cordon () {
			return this.children.cordon
		}

		cordonBounds() {
			return [VMFVector(this.cordon.prop.mins).fix(),VMFVector(this.cordon.prop.maxs).fix()]
		}

		rotatedBounds(angle,center) {
			var mins = VMFVector(this.cordon.prop.mins).subtract(center).rotateZ(angle).add(center)
			var maxs = VMFVector(this.cordon.prop.maxs).subtract(center).rotateZ(angle).add(center)

			return [ new hlib.Vector(Math.min(mins.x,maxs.x),Math.min(mins.y,maxs.y),Math.min(mins.z,maxs.z),mins.sbrackets),new hlib.Vector(Math.max(mins.x,maxs.x),Math.max(mins.y,maxs.y),Math.max(mins.z,maxs.z),maxs.sbrackets)]
		}

		get cordonMins() {
			return VMFVector(this.cordon.prop.mins)
		}
		get cordonMaxs() {
			return VMFVector(this.cordon.prop.maxs)
		}

		merge(obj){
			if (this.sidematrixes_cache){delete this.sidematrixes_cache}
			for (let key1 in obj.world.children) {
				if (!Array.isArray(obj.world.children[key1])){this.world.addChild(obj.world.children[key1]);continue}
				for (let key2 in obj.world.children[key1]) {
					this.world.addChild(obj.world.children[key1][key2])
				}
			}


			for (let key1 in obj.entity) {
				if (!Array.isArray(obj.entity[key1])){this.addChild(obj.entity[key1]);continue}
				for (let key2 in obj.entity[key1]) {
					this.addChild(obj.entity[key1][key2])
				}
			}

		}

		removeCordonBrushes(){
			if (this.sidematrixes_cache){delete this.sidematrixes_cache}
			for (let key1 in (this.world.children.solid.type == 'solid' ? [this.world.children.solid] : this.world.children.solid)) {
				let solid = (this.world.children.solid[key1] || this.world.children.solid)
				if (solid.children.editor.prop.cordonsolid=="1"){
					if (this.world.children.solid.type == 'solid'){delete this.world.children.solid} else {delete this.world.children.solid[key1]}
				}
			}
		}

		removeCordon(){
			delete this.children.cordon
		}

		getMaximumID() {
			var max=0
			var children = this.findChildren()
			for (let child in children){
				if(children[child].prop&&children[child].prop.id){max=Math.max(max,parseInt(children[child].prop.id))}
				if(children[child].prop&&children[child].prop.groupid){max=Math.max(max,parseInt(children[child].prop.groupid))}
			}
			return max
		}

		addToID(add) {
			if (this.sidematrixes_cache){delete this.sidematrixes_cache}
			var children = this.findChildren()
			for (let child in children){
				if(children[child].prop&&children[child].prop.id){children[child].prop.id=parseInt(children[child].prop.id)+add}
				if(children[child].prop&&children[child].prop.groupid){children[child].prop.groupid=parseInt(children[child].prop.groupid)+add}
			}
		}

		switchDoorVisGroup(holeid){

			var visgroup = holeid ? this.getEntityByID(holeid).prop.enablevisgroup : "";
			var visgroupid;

			for (let evisgroup of (this.visgroups.children.visgroup.type == 'visgroup' ? [this.visgroups.children.visgroup] : this.visgroups.children.visgroup)){
				let name = evisgroup.prop.name
				if (name==visgroup){
					visgroupid=evisgroup.prop.visgroupid
					log("Unhiding visgroup "+name)
				}
			}

			if (this.world.children.hidden){
				for (let hidden of (this.world.children.hidden.type == 'hidden' ? [this.world.children.hidden] : this.world.children.hidden)){
					let solid = hidden.children.solid
					if (solid.children.editor.prop.visgroupid==visgroupid){
						solid.children.editor.prop.visgroupshown = '1'
						this.children.world.children.solid.push(solid)
					}
				}
			}

			if (this.children.hidden){
				for (let hidden of (this.children.hidden.type == 'hidden' ? [this.children.hidden] : this.children.hidden)){
					let entity = hidden.children.entity
					if (entity.children.editor.prop.visgroupid==visgroupid){
						entity.children.editor.prop.visgroupshown = '1'
						this.entity.push(entity)
					}
				}
			}

		}

		switchVisGroups(random){
			if (this.sidematrixes_cache){delete this.sidematrixes_cache}
			if (!this.visgroups.children.visgroup){return}

			var variantsgroups = [];
			var variantgroup;
			var terminategroups = [];

			for (let evisgroup of (this.visgroups.children.visgroup.type == 'visgroup' ? [this.visgroups.children.visgroup] : this.visgroups.children.visgroup)){
				let name = evisgroup.prop.name
				if (name.startsWith('variant_')){
					variantsgroups.push([evisgroup.prop.visgroupid,name.replace('variant_','')])
				}
			}

			if (variantsgroups.length>0){
				let key = Math.round(random()*(variantsgroups.length-1))
				let variantgroupt = variantsgroups[key]
				log("Applying variant "+variantgroupt[1])
				variantgroup=variantgroupt[0]
				variantsgroups.splice(key,1)
				for (let group of variantsgroups){terminategroups[group[0]]=true}
			}

			for (let key1 in (this.world.children.solid.type == 'solid' ? [this.world.children.solid] : this.world.children.solid)) {
				let solid = (this.world.children.solid[key1] || this.world.children.solid)
				if (terminategroups[solid.children.editor.prop.visgroupid]){
					if (this.world.children.solid.type == 'solid'){delete this.world.children.solid} else {delete this.world.children.solid[key1]}
				}
			}

			if (this.world.children.hidden){
				for (let hidden of (this.world.children.hidden.type == 'hidden' ? [this.world.children.hidden] : this.world.children.hidden)){
					let solid = hidden.children.solid
					if (solid.children.editor.prop.visgroupid==variantgroup){
						solid.children.editor.prop.visgroupshown = '1'
						this.children.world.children.solid.push(solid)
					}
				}
				delete this.world.children.hidden
			}

			for (let key1 in (this.entity.type == 'solid' ? [this.entity] : this.entity)) {
				let entity = (this.entity[key1] || this.entity)
				if (terminategroups[entity.children.editor.prop.visgroupid]){
					if (this.entity.type == 'solid'){delete this.children.entity} else {delete this.children.entity[key1]}
				}
			}

			if (this.children.hidden){
				for (let hidden of (this.children.hidden.type == 'hidden' ? [this.children.hidden] : this.children.hidden)){
					let entity = hidden.children.entity
					if (entity.children.editor.prop.visgroupid==variantgroup){
						entity.children.editor.prop.visgroupshown = '1'
						this.entity.push(entity)
					}
				}
				delete this.children.hidden
			}
			
			delete this.visgroups.children

			//	getEntityByID
			/*var children = this.findChildren()
			for (let child in children){
				if(children[child].prop&&children[child].prop.visgroupid){delete children[child].prop.visgroupid}
			}*/
		}

		connectablesides(angle,center){
			var sides=[]
			var sidematrixes = this.sidematrixes(angle,center)

			for (let side in sidematrixes){
				if (sidematrixes[side].nonempty){sides.push([side,sidematrixes[side].length])}			
			}

			return sides
		}

		sidematrixes(angle,center) {
			//if (this.sidematrixes_cache){return this.sidematrixes_cache}
			var cbounds = center ? this.rotatedBounds(angle,center) : this.cordonBounds()
			var size = cbounds[1].subtract(cbounds[0])
			var matrixes=[[],[],[],[],[],[]]
			matrixes.size = new hlib.Vector(Math.round(size.x/TILESIZE),Math.round(size.y/TILESIZE),Math.round(size.z/TILESIZE))

			var portals=this.FindPortals()
			for (let portal of portals){
				let bounds=center ?  portal[0].rBounds(angle,center) : portal[0].bounds()
				let minBounds=bounds[0].subtract(cbounds[0]).divide(TILESIZE)
				let maxBounds=bounds[1].subtract(cbounds[0]).divide(TILESIZE)

				let connectiontype = (portal[1] || '1').split('|')

				switch (true) {
					case bounds[1].z == cbounds[1].z:
						matrixes[0].push([[minBounds.x,minBounds.y],[maxBounds.x,maxBounds.y],connectiontype,portal[2]])
						matrixes[0].nonempty = true
						break
					case bounds[1].y == cbounds[1].y:
						matrixes[1].push([[minBounds.x,minBounds.z],[maxBounds.x,maxBounds.z],connectiontype,portal[2]])
						matrixes[1].nonempty = true
						break
					case bounds[0].x == cbounds[0].x:
						matrixes[2].push([[minBounds.y,minBounds.z],[maxBounds.y,maxBounds.z],connectiontype,portal[2]])
						matrixes[2].nonempty = true
						break
					case bounds[1].x == cbounds[1].x:	
						matrixes[3].push([[minBounds.y,minBounds.z],[maxBounds.y,maxBounds.z],connectiontype,portal[2]])
						matrixes[3].nonempty = true
						break		
					case bounds[0].y == cbounds[0].y:
						matrixes[4].push([[minBounds.x,minBounds.z],[maxBounds.x,maxBounds.z],connectiontype,portal[2]])
						matrixes[4].nonempty = true
						break
					case bounds[0].z == cbounds[0].z:
						matrixes[5].push([[minBounds.x,minBounds.y],[maxBounds.x,maxBounds.y],connectiontype,portal[2]])
						matrixes[5].nonempty = true
				}
			}

			this.sidematrixes_cache = matrixes
			
			return matrixes
		}

		FindPortals() {
			var portals=[]

			if (this.entity.prop&&this.entity.prop.classname=="func_portaldoor"){
				portals.push([this.entity.children.solid,this.entity.prop.connectiontype,this.entity.prop.id])
				return portals
			}

			for (let key in this.entity){
				if (this.entity[key].children.solid&&this.entity[key].prop.classname=="func_portaldoor"){
					portals.push([this.entity[key].children.solid,this.entity[key].prop.connectiontype,this.entity[key].prop.id])
				}
			}
			return portals
		}

		unEntityPortals(){
			var portals=[]

			if (this.entity.prop&&this.entity.prop.classname=="func_portaldoor"){
				this.children.world.children.solid.push(this.entity.children.solid)
				delete this.children.entity
				this.children.entity=[];
				return
			}

			for (let key in this.entity){
				if (this.entity[key].children.solid&&this.entity[key].prop.classname=="func_portaldoor"){
					this.children.world.children.solid.push(this.entity[key].children.solid)
					delete this.entity[key]
				}
			}
		}

		getEntityByID(id){
			if (this.entity.prop&&this.entity.prop.id==id){return this.children.entity}
			for (let key in this.entity){
				let entity = this.entity[key]
				if (entity.prop.id==id){return this.entity[key]}
			}
		}

		removePortalByID(id,ignoreareaportal){
			if (this.sidematrixes_cache){delete this.sidematrixes_cache}
			if (this.entity.prop&&this.entity.prop.id==id){
				if (this.entity.prop.areaportal=="1"&&!ignoreareaportal){
					for (let side of this.entity.children.solid.children.side){
						side.prop.material = AREAPORTAL_MATERIAL
					}
					this.entity.prop.classname = "func_areaportal"
					delete this.entity.prop.areaportal
				} else {
					delete this.children.entity
					this.children.entity=[]
				}
			}
			for (let key in this.entity){
				let entity = this.entity[key]
				if (entity.prop.id==id){
					if (entity.prop.areaportal=="1"&&!ignoreareaportal){
						for (let side of entity.children.solid.children.side){
							side.prop.material = AREAPORTAL_MATERIAL
						}
						entity.prop.classname = "func_areaportal"
						delete entity.prop.areaportal
					} else {
						delete this.entity[key]
					}
				}
			}
		}

		onlyOnce(){
			this.once = true
		}

	}

	class VMFSolid extends VMFObject {
		bounds() {
			var min=new hlib.Vector(Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER)
			var max=new hlib.Vector(Number.MIN_SAFE_INTEGER,Number.MIN_SAFE_INTEGER,Number.MIN_SAFE_INTEGER)
			for (let key in this.children.side){
				let planes = this.children.side[key].planes
				for (let plane in planes){
					min.x=Math.min(min.x,planes[plane].x)
					min.y=Math.min(min.y,planes[plane].y)
					min.z=Math.min(min.z,planes[plane].z)
					max.x=Math.max(max.x,planes[plane].x)
					max.y=Math.max(max.y,planes[plane].y)
					max.z=Math.max(max.z,planes[plane].z)
				}
			}
			return [min.fix(),max.fix()]
		}

		rBounds(angle,center) {
			var bounds = this.bounds()
			var mins = bounds[0].subtract(center).rotateZ(angle).add(center)
			var maxs = bounds[1].subtract(center).rotateZ(angle).add(center)

			return [ new hlib.Vector(Math.min(mins.x,maxs.x),Math.min(mins.y,maxs.y),Math.min(mins.z,maxs.z),mins.sbrackets),new hlib.Vector(Math.max(mins.x,maxs.x),Math.max(mins.y,maxs.y),Math.max(mins.z,maxs.z),maxs.sbrackets)]
		}

		/*
		containMaterial(mat) {
			for (let key in this.children.side){
				if (this.children.side[key].prop.material == mat) {return true}
			}
			return false
		}
		*/

	}

	class VMFSide extends VMFObject {
		get planes() {
			if (!this.prop.plane){return null}
			return VMFPlane(this.prop.plane)
		}
		get UVMap(){
			return [VMFUVMap(this.prop.uaxis),VMFUVMap(this.prop.vaxis)]
		}
	}

	class VMFEntity extends VMFObject {
		get origin() {
			if (!this.prop.origin){return null}
			return VMFVector(this.prop.origin)
		}
		get angles() {
			if (!this.prop.angles){return null}
			return VMFVector(this.prop.angles)
		}
	}

	module.exports.snames = snames
	module.exports.TILESIZE = TILESIZE
	module.exports.parse = parse

})()
