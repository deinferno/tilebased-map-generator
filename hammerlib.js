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
		this.z = parseFloat(z) || 0
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

	distance(v) {
    	return Math.sqrt(Math.pow(this.x - v.x,2) + Math.pow(this.y - v.y,2) + Math.pow(this.z - v.z,2));
  	}

	length() {
    	return Math.sqrt(this.dot(this));
	}


	equal(v) {
		return this.x == v.x && this.y == v.y && this.z == v.z
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

	fix(){
		return new Vector(this.x.toFixed(8),this.y.toFixed(8),this.z.toFixed(8))
	}

	rotateX(a){
		a = radians(a)
		return new Vector(this.x,(this.y*Math.cos(a)-(this.z*Math.sin(a))).toFixed(8),(this.y*Math.sin(a)+this.z*Math.cos(a)).toFixed(8), this.sbrackets)
	}

	rotateY(a){
		a = radians(a)
		return new Vector((this.x*Math.cos(a)+(this.z*Math.sin(a))).toFixed(8),this.y,(-this.x*Math.sin(a)+this.z*Math.cos(a)).toFixed(8), this.sbrackets)
	}


	rotateZ(a){
		a = radians(a)
		return new Vector((this.x*Math.cos(a)-(this.y*Math.sin(a))).toFixed(8),(this.x*Math.sin(a)+this.y*Math.cos(a)).toFixed(8),this.z, this.sbrackets)
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
		return new UVMap((this.x*Math.cos(a)-(this.y*Math.sin(a))).toFixed(8),(this.x*Math.sin(a)+this.y*Math.cos(a)).toFixed(8),this.z, this.shift, this.scale)
	}

	toString(){
		return '['+this.x+' '+this.y+' '+this.z+' '+this.shift+'] '+this.scale
	}
	
}

module.exports.UVMap = UVMap

})()
