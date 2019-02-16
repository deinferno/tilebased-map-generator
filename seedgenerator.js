(function() {

	var chars = 'ABCDEFGHJKLMNPQRSTVWXYZ123467890';

	function makeseed() {
	
	var seed = process.argv.slice(2)[0];
	
	if (seed && seed.length == 8) {
	
		seed = seed.toUpperCase();
		
		seed = seed.replace(/5/g, 'S');
		seed = seed.replace(/I/g, '1');
		seed = seed.replace(/O/g, '0');
		seed = seed.replace(/U/g, 'V')
		
		seed = seed.replace(/[^ABCDEFGHJKLMNPQRSTVWXYZ123467890]/g, '')
	
	} 
	
	if (!seed || seed.length!=8) {
	  var seed = '';
	  for (let i = 0; i < 8; i++)
	    seed += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	
	return seed
	
	}

	module.exports = makeseed

})()