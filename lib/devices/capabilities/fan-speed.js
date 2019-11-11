'use strict';

const { Thing } = require('abstract-things');
const { FanSpeed } = require('abstract-things/climate');

module.exports = Thing.mixin(Parent => class extends Parent.with(FanSpeed) {
	fs1 = -1;
	fs2 = -1;
	propertyUpdated(key, value) {
		let updated = false;
		if (key === 'fanSpeed1') {
			this.fs1 = value;
			updated = true;
		}
		if (key === 'fanSpeed2') {
			this.fs2 = value;
			updated = true;
		}

		if(updated) {
			const value = this.fs2 || this.fs1;
			if(value !== -1) {
				this.updateFanSpeed(value);
			}
		}

		super.propertyUpdated(key, value);
	}
});
