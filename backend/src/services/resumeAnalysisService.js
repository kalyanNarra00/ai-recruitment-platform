const axios = require('axios');
const path = require('path');
const { execFile } = require('child_process');

const pythonExecutable = process.env.PYTHON_EXECUTABLE
  || 'C:\\Users\\kalya\\AppData\\Local\\Python\\pythoncore-3.14-64\\python.exe';

const analyzeWithLocalPython = (payload) => new Promise((resolve, reject) => {
  const scriptPath = path.resolve(__dirname, '..', '..', '..', 'ai-service', 'analyze_resume_cli.py');
  const workingDirectory = path.resolve(__dirname, '..', '..', '..', 'ai-service');

  const child = execFile(
    pythonExecutable,
    [scriptPath],
    {
      cwd: workingDirectory,
      windowsHide: true,
      timeout: 120000,
      maxBuffer: 10 * 1024 * 1024,
    },
    (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }

      try {
        resolve(JSON.parse(stdout));
      } catch (parseError) {
        reject(new Error(`Failed to parse AI output: ${parseError.message}`));
      }
    }
  );

  child.stdin.write(JSON.stringify(payload));
  child.stdin.end();
});

const analyzeResume = async (payload) => {
  const aiServiceUrl = process.env.AI_SERVICE_URL;

  if (aiServiceUrl) {
    try {
      const response = await axios.post(`${aiServiceUrl}/api/analyze-resume`, payload, {
        timeout: 15000,
      });
      return response.data;
    } catch (error) {
      console.warn('AI service unavailable, falling back to local Python analysis.');
    }
  }

  return analyzeWithLocalPython(payload);
};

module.exports = { analyzeResume };
