'use strict';

const { AirPurifier } = require('abstract-things/climate');
const MiioApi = require('../device');

const Power = require('./capabilities/power');
const Mode = require('./capabilities/mode');
const SwitchableLED = require('./capabilities/switchable-led');
const LEDBrightness = require('./capabilities/changeable-led-brightness');
const Buzzer = require('./capabilities/buzzer');
const FanSpeed = require('./capabilities/fan-speed');
const { Temperature, Humidity, AQI } = require('./capabilities/sensor');

/**
 * Abstraction over a Mi Air Purifier.
 *
 * Air Purifiers have a mode that indicates if is on or not. Changing the mode
 * to `idle` will power off the device, all other modes will power on the
 * device.
 */
module.exports = class extends AirPurifier
	.with(MiioApi, Power, Mode, Temperature, Humidity, AQI,
		SwitchableLED, LEDBrightness, Buzzer, FanSpeed)
{

	static get type() {
		return 'miio:air-purifier';
	}

	constructor(options) {
		super(options);

		// Define the power property
		this.defineProperty('power', v => v === 'on');

		// Set the mode property and supported modes
		this.defineProperty('mode');
		this.updateModes([
			'idle',
			'auto',
			'silent',
			'favorite'
		]);

		// Sensor value for Temperature capability
		this.defineProperty('temp_dec', {
			name: 'temperature',
			mapper: v => v / 10.0
		});

		// Sensor value for RelativeHumidity capability
		this.defineProperty('humidity');

		// Sensor value used for AQI (PM2.5) capability
		this.defineProperty('aqi', {
			name: 'aqi',
		});
		this.defineProperty('average_aqi', {
			name: 'averageAqi',
		});

		// The favorite level
		this.defineProperty('favorite_level', {
			name: 'favoriteLevel'
		});

		// Info about usage
		this.defineProperty('filter1_life', {
			name: 'filterLifeRemaining'
		});
		this.defineProperty('f1_hour_used', {
			name: 'filterHoursUsed'
		});
		this.defineProperty('use_time', {
			name: 'useTime'
		});
		this.defineProperty('motor1_speed', {
			name: 'fanSpeed1',
		});
		this.defineProperty('motor2_speed', {
			name: 'fanSpeed2',
		});
		this.defineProperty('bright', {
			name: 'bright',
		});
		this.defineProperty('child_lock', {
			name: 'childLock',
		});

		// State for SwitchableLED capability
		this.defineProperty('led', {
			mapper: v => v === 'on'
		});

		this.defineProperty('led_b', {
			name: 'ledBrightness',
			mapper: v => {
				switch(v) {
					case 0:
						return 'bright';
					case 1:
						return 'dim';
					case 2:
						return 'off';
					default:
						return 'unknown';
				}
			}
		});

		// Buzzer and beeping
		this.defineProperty('buzzer', {
			mapper: v => v === 'on'
		});
	}

	changePower(power) {
		return this.call('set_power', [ power ? 'on' : 'off' ], {
			refresh: [ 'power', 'mode' ],
			refreshDelay: 200
		});
	}

	/**
	 * Perform a mode change as requested by `mode(string)` or
	 * `setMode(string)`.
	 */
	changeMode(mode) {
		return this.call('set_mode', [ mode ], {
			refresh: [ 'power', 'mode' ],
			refreshDelay: 200
		})
			.then(MiioApi.checkOk)
			.catch(err => {
				throw err.code === -5001 ? new Error('Mode `' + mode + '` not supported') : err;
			});
	}

	aqi(aqi=undefined) {
		if(typeof aqi === 'undefined') {
			return Promise.resolve(this.property('aqi'));
		}

		return this.aqi(aqi);
	}

	averageAqi(averageAqi=undefined) {
		if(typeof averageAqi === 'undefined') {
			return Promise.resolve(this.property('averageAqi'));
		}

		return this.averageAqi(averageAqi);
	}

	/**
	 * Get the favorite level used when the mode is `favorite`. Between 0 and 16.
	 */
	favoriteLevel(level=undefined) {
		if(typeof level === 'undefined') {
			return Promise.resolve(this.property('favoriteLevel'));
		}

		return this.setFavoriteLevel(level);
	}

	/**
	 * Set the favorite level used when the mode is `favorite`, should be
	 * between 0 and 16.
	 */
	setFavoriteLevel(level) {
		return this.call('set_level_favorite', [ level ])
			.then(() => null);
	}

	/**
	 * Info
	 */

	fanSpeed1(fanSpeed1=undefined) {
		if(typeof fanSpeed1 === 'undefined') {
			return Promise.resolve(this.property('fanSpeed1'));
		}

		return this.fanSpeed1(fanSpeed1);
	}

	fanSpeed2(fanSpeed2=undefined) {
		if(typeof fanSpeed2 === 'undefined') {
			return Promise.resolve(this.property('fanSpeed2'));
		}

		return this.fanSpeed2(fanSpeed2);
	}

	bright(bright=undefined) {
		if(typeof bright === 'undefined') {
			return Promise.resolve(this.property('bright') / 2.0);
		}

		return this.bright(bright / 2.0);
	}

	childLock(childLock=undefined) {
		if(typeof childLock === 'undefined') {
			return Promise.resolve(this.property('childLock'));
		}

		return this.childLock(childLock);
	}

	/**
	 * Filter information
	 */

	filterHoursUsed(filterHoursUsed=undefined) {
		if(typeof filterHoursUsed === 'undefined') {
			return Promise.resolve(this.property('filterHoursUsed'));
		}

		return this.filterHoursUsed(filterHoursUsed);
	}

	filterDaysUsed(filterDaysUsed=undefined) {
		if(typeof filterHoursUsed === 'undefined') {
			return Promise.resolve(Math.floor(this.property('filterHoursUsed') / 24.0));
		}

		return this.filterDaysUsed(filterHoursUsed / 24.0);
	}

	filterHoursRemaining(filterHoursRemaining=undefined) {
		if(typeof filterHoursRemaining === 'undefined') {
			return Promise.resolve((this.property('filterLifeRemaining') * 24.0));
		}

		return this.filterHoursRemaining(filterDaysRemaining * 24);
	}

	filterDaysRemaining(filterDaysRemaining=undefined) {
		if(typeof filterDaysRemaining === 'undefined') {
			return Promise.resolve(this.property('filterLifeRemaining'));
		}

		return this.filterDaysRemaining(filterDaysRemaining);
	}

	/**
	 * Set the LED brightness to either `bright`, `dim` or `off`.
	 */
	changeLEDBrightness(level) {
		switch(level) {
			case 'bright':
				level = 0;
				break;
			case 'dim':
				level = 1;
				break;
			case 'off':
				level = 2;
				break;
			default:
				return Promise.reject(new Error('Invalid LED brigthness: ' + level));
		}
		return this.call('set_led_b', [ level ], { refresh: [ 'ledBrightness' ] })
			.then(() => null);
	}
};
