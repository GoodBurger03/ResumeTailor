/**
 * JobTailor API — Azure Functions entry point.
 * Importing each function file registers it with the Azure Functions runtime.
 */

import './functions/jobs.js';
import './functions/claude.js';
import './functions/health.js';
