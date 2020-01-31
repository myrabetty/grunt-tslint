var expect = require('chai').expect;
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var ChildProcess = require('cover-child-process').ChildProcess;
var Blanket = require('cover-child-process').Blanket;
var childProcess = new ChildProcess(new Blanket());

var gruntExec = 'node ' + path.resolve('node_modules/grunt-cli/bin/grunt --no-color');

var execGrunt = function (parameters, callback) {
    parameters = parameters || [];
    childProcess.exec([gruntExec].concat(parameters).join(' '), {
        cwd: path.resolve(__dirname)
    }, callback);
};

var fixture = function (file, scenario) {
    var dir = path.join(__dirname, '../../test', (scenario ? 'scenarios/' + scenario : 'fixtures'));
    return path.join(dir, file);
};

describe('grunt-tslint-code-climate on a single file', function () {
    it('should find errors in single invalid .ts file', function (done) {
        execGrunt('--gruntfile ' + fixture('Gruntfile.js', 'single-error-file'), function (error, stdout, stderr) {
            expect(stdout).to.match(/1 error and 0 warnings in 1 file/);
            done();
        });
    });

    it('should not find errors in a single valid .ts file', function (done) {
        execGrunt('--gruntfile ' + fixture('Gruntfile.js', 'single-valid-file'), function (error, stdout, stderr) {
            expect(stdout).to.match(/1 file lint free/);
            done();
        });
    });

    it('should find errors in single invalid .ts file that requires type checking', function (done) {
        execGrunt('--gruntfile ' + fixture('Gruntfile.js', 'requires-type-checking'), function (error, stdout, stderr) {
            expect(stdout).to.match(/1 error and 0 warnings in 1 file/);
            done();
        });
    });
});

describe('grunt-tslint on multiple files', function () {

    var scenario = 'multi-error-files',
        tmpDir = fixture('tmp', scenario),
        tmpOutput;

    beforeEach(function (next) {
        mkdirp(tmpDir, next);
    });

    afterEach(function (next) {
        rimraf(tmpDir, next);
    });

    it('should find errors in multiple invalid .ts files', function (done) {

        execGrunt([
            '--gruntfile ', fixture('Gruntfile.js', scenario),
            'tslintCodeClimate:stdout'
        ].join(' '), function (error, stdout, stderr) {

            expect(stdout).to.contain('Task "tslintCodeClimate:stdout" failed');

            tmpOutput = stdout.split('\n')
                .filter(function (line) {
                    var isOutputLine = (line.indexOf('>> ') === 0);
                    var isSummaryLine = /[0-9]+ error(s?) and [0-9]+ warning(s?) in [0-9]+ file(s?)/.test(line);
                    return isOutputLine && !isSummaryLine;
                })
                .map(function (line) {
                    return line.substr(3);
                })
                .join('\n');

            done();
        });

    });

    it('should write output of multiple invalid .ts files into a single outputFile', function (done) {

        expect(tmpOutput).to.not.be.empty;

        execGrunt([
            '--gruntfile ', fixture('Gruntfile.js', scenario),
            'tslintCodeClimate:file'
        ].join(' '), function (error, stdout, stderr) {
            var outputFileContents = fs.readFileSync(path.join(tmpDir, 'outputFile')).toString().trim();
            expect(outputFileContents).to.be.equal(tmpOutput);
            done();
        });

    });
});

describe('grunt-tslint-code-climate on multiple file with code climate enabled and output json.', function () {

    var scenario = 'code-climate-output',
        tmpDir = fixture('tmp', scenario);

    beforeEach(function (next) {
        mkdirp(tmpDir, next);
    });

    afterEach(function (next) {
        rimraf(tmpDir, next);
    });

    it('should write output of multiple invalid .ts files into a single output in json format and a code-climate file', function (done) {
        execGrunt([
            '--gruntfile ', fixture('Gruntfile.js', scenario),
            'tslintCodeClimate:JSONfile'
        ].join(' '), function (error, stdout, stderr) {
            var outputFileContents = fs.readFileSync(path.join(tmpDir, 'outputJSONFile')).toString().trim(),
                expectedContent = "[{\"endPosition\":{\"character\":15,\"line\":0,\"position\":15},\"failure\":\"' should be \\\"\",\"fix\":{\"innerStart\":9,\"innerLength\":6,\"innerText\":\"\\\"abcd\\\"\"},\"name\":\"errorFile1.ts\",\"ruleName\":\"quotemark\",\"ruleSeverity\":\"ERROR\",\"startPosition\":{\"character\":9,\"line\":0,\"position\":9}}]\n[{\"endPosition\":{\"character\":21,\"line\":3,\"position\":90},\"failure\":\"Use of debugger statements is forbidden\",\"name\":\"errorFile2.ts\",\"ruleName\":\"no-debugger\",\"ruleSeverity\":\"ERROR\",\"startPosition\":{\"character\":12,\"line\":3,\"position\":81}},{\"endPosition\":{\"character\":16,\"line\":4,\"position\":107},\"failure\":\"forbidden eval\",\"name\":\"errorFile2.ts\",\"ruleName\":\"no-eval\",\"ruleSeverity\":\"ERROR\",\"startPosition\":{\"character\":12,\"line\":4,\"position\":103}}]";

            expect(outputFileContents).to.be.equal(expectedContent);

            var codeClimateContents = fs.readFileSync(path.join(tmpDir, 'code-quality-report-JSON.json')).toString().trim(),
                codeClimateExpectedContent = '[{\"description\":\"\' should be \\"\",\"fingerprint\":\"340d12a129d3fb79c370bbc4a8130256\",\"location\":{\"path\":\"errorFile1.ts\",\"lines\":{\"begin\":9}}},{\"description\":\"Use of debugger statements is forbidden\",\"fingerprint\":\"11b290d6e4989aad96493bf288502227\",\"location\":{\"path\":\"errorFile2.ts\",\"lines\":{\"begin\":81}}},{\"description\":\"forbidden eval\",\"fingerprint\":\"54768ffce890becb45b804cc22ec1d2d\",\"location\":{\"path\":\"errorFile2.ts\",\"lines\":{\"begin\":103}}}]';

            expect(codeClimateContents).to.be.equal(codeClimateExpectedContent);
            done();
        });

    });
});


describe('grunt-tslint-code-climate on multiple file with code climate enabled and output format prose.', function () {

    var scenario = 'code-climate-output',
        tmpDir = fixture('tmp', scenario);

    beforeEach(function (next) {
        mkdirp(tmpDir, next);
    });

    afterEach(function (next) {
        rimraf(tmpDir, next);
    });

    it('should write output of multiple invalid .ts files into a single output in prose format and a code-climate file.', function (done) {
        execGrunt([
            '--gruntfile ', fixture('Gruntfile.js', scenario),
            'tslintCodeClimate:file'
        ].join(' '), function (error, stdout, stderr) {
            var outputFileContents = fs.readFileSync(path.join(tmpDir, 'outputFile')).toString().trim(),
                expectedContent = "ERROR: errorFile1.ts[1, 10]: ' should be \"\n" +
                    "ERROR: errorFile2.ts[4, 13]: Use of debugger statements is forbidden\n" +
                    "ERROR: errorFile2.ts[5, 13]: forbidden eval";
            expect(outputFileContents).to.be.equal(expectedContent);

            var codeClimateContents = fs.readFileSync(path.join(tmpDir, 'code-quality-report.json')).toString().trim(),
                codeClimateExpectedContent = '[{\"description\":\"\' should be \\"\",\"fingerprint\":\"340d12a129d3fb79c370bbc4a8130256\",\"location\":{\"path\":\"errorFile1.ts\",\"lines\":{\"begin\":9}}},{\"description\":\"Use of debugger statements is forbidden\",\"fingerprint\":\"11b290d6e4989aad96493bf288502227\",\"location\":{\"path\":\"errorFile2.ts\",\"lines\":{\"begin\":81}}},{\"description\":\"forbidden eval\",\"fingerprint\":\"54768ffce890becb45b804cc22ec1d2d\",\"location\":{\"path\":\"errorFile2.ts\",\"lines\":{\"begin\":103}}}]';
            expect(codeClimateContents).to.be.equal(codeClimateExpectedContent);
            done();
        });
    });
});
