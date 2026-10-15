import {existsSync} from 'node:fs';
if(existsSync('.env'))process.loadEnvFile('.env');
if(existsSync('.env.local'))process.loadEnvFile('.env.local');
