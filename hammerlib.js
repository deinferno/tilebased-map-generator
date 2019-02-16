"use strict";

(function() {

var floor=Math.floor
var ceil=Math.ceil
var abs=Math.abs

var radians = function(degrees) {
  return degrees * Math.PI / 180
}

class Vector {

	constructor(x, y, z, sbrackets) {
		this.x = parseFloat(x) || 0
		this.y = parseFloat(y) || 0
		this.z = parseFloat(z)  || 0
		this.sbrackets = sbrackets
	}

	add(v) {
		if (v instanceof Vector) return new Vector(this.x + v.x, this.y + v.y, this.z + v.z, this.sbrackets)
		else return new Vector(this.x + v, this.y + v, this.z + v, this.sbrackets)
	}

	subtract(v) {
		if (v instanceof Vector) return new Vector(this.x - v.x, this.y - v.y, this.z - v.z, this.sbrackets)
		else return new Vector(this.x - v, this.y - v, this.z - v, this.sbrackets)
	}

	multiply(v) {
		if (v instanceof Vector) return new Vector(this.x * v.x, this.y * v.y, this.z * v.z, this.sbrackets)
		else return new Vector(this.x * v, this.y * v, this.z * v, this.sbrackets)
	}

	divide(v) {
		if (v instanceof Vector) return new Vector(this.x / v.x, this.y / v.y, this.z / v.z, this.sbrackets)
		else return new Vector(this.x / v, this.y / v, this.z / v, this.sbrackets)
	}

	dot(v) {
    	return this.x * v.x + this.y * v.y + this.z * v.z;
  	}

	length() {
    	return Math.sqrt(this.dot(this));
	}

	floor() {
		return new Vector(floor(this.x),floor(this.y),floor(this.z), this.sbrackets)
	}

	ceil() {
		return new Vector(ceil(this.x),ceil(this.y),ceil(this.z), this.sbrackets)
	}

	abs() {
		return new Vector(abs(this.x),abs(this.y),abs(this.z), this.sbrackets)
	}

	toString(){
		return (this.sbrackets ? '(' : '')+this.x+' '+this.y+' '+this.z+(this.sbrackets ? ')' : '')
	}

	rotateZ(a){
		a = radians(a)
		return new Vector((this.x*Math.cos(a)-(this.y*Math.sin(a))).toFixed(4),(this.x*Math.sin(a)+this.y*Math.cos(a)).toFixed(4),this.z, this.sbrackets)
	}

}

module.exports.Vector = Vector

class UVMap {

	constructor (x, y, z, shift, scale) {
		this.x = parseFloat(x) || 0
		this.y = parseFloat(y) || 0
		this.z = parseFloat(z) || 0
		this.shift = parseFloat(shift) || 0
		this.scale = parseFloat(scale) || 0
	}

	rotateZ(a){
		a = radians(a)
		return new UVMap((this.x*Math.cos(a)-(this.y*Math.sin(a))).toFixed(4),(this.x*Math.sin(a)+this.y*Math.cos(a)).toFixed(4),this.z, this.shift, this.scale)
	}

	toString(){
		return '['+this.x+' '+this.y+' '+this.z+' '+this.shift+'] '+this.scale
	}
	
}

module.exports.UVMap = UVMap

})()
