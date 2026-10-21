'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const JS_DIR = path.join(__dirname, '..', 'empires', 'js');
const FILES = ['config.js','audio.js','map.js','pathfinding.js','entities.js','renderer.js','ai.js','game.js'];

function makeCtx(){const noop=()=>{};return{filled:false};Object.assign(dummy,{fillStyle:'',strokeStyle:'',lineWidth:1});return dummy;}
