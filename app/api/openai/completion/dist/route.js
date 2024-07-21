"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
exports.__esModule = true;
exports.POST = exports.config = void 0;
var auth_1 = require("@/lib/auth");
var openai_1 = require("@/lib/openai");
var next_auth_1 = require("next-auth");
var server_1 = require("next/server");
// Conditionally set runtime based on the base URL
var isLocalhost = function () {
    return process.env.NEXT_PUBLIC_BASE_URL === 'http://localhost:3000';
};
exports.config = {
    runtime: isLocalhost() ? undefined : 'edge'
};
function POST(req) {
    return __awaiter(this, void 0, void 0, function () {
        var session, openai, prompt, response_1, stream, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, next_auth_1.getServerSession(auth_1.authOptions)];
                case 1:
                    session = _a.sent();
                    if (!session) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 })];
                    }
                    return [4 /*yield*/, openai_1.openAiHelper(session.user.id)];
                case 2:
                    openai = _a.sent();
                    if (!openai) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: "No openai key found" }, { status: 500 })];
                    }
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 6, , 7]);
                    return [4 /*yield*/, req.json()];
                case 4:
                    prompt = (_a.sent()).prompt;
                    if (typeof prompt !== 'string' || prompt.trim().length === 0) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: "Invalid value for 'prompt': expected a non-empty string." }, { status: 400 })];
                    }
                    return [4 /*yield*/, openai.chat.completions.create({
                            model: "gpt-4",
                            max_tokens: 4096,
                            messages: [
                                {
                                    role: "system",
                                    content: "You are an executive assistant to a nonprofit. You are responsible for providing helpful, supportive guidance to end users and to case managers in forming well-crafted plans out of the available resource landscape to help guide clients to better outcomes."
                                },
                                { role: "user", content: prompt },
                            ],
                            stream: true
                        })];
                case 5:
                    response_1 = _a.sent();
                    stream = new ReadableStream({
                        start: function (controller) {
                            var e_1, _a;
                            var _b, _c;
                            return __awaiter(this, void 0, void 0, function () {
                                var encoder, response_2, response_2_1, chunk, text, e_1_1;
                                return __generator(this, function (_d) {
                                    switch (_d.label) {
                                        case 0:
                                            encoder = new TextEncoder();
                                            _d.label = 1;
                                        case 1:
                                            _d.trys.push([1, 6, 7, 12]);
                                            response_2 = __asyncValues(response_1);
                                            _d.label = 2;
                                        case 2: return [4 /*yield*/, response_2.next()];
                                        case 3:
                                            if (!(response_2_1 = _d.sent(), !response_2_1.done)) return [3 /*break*/, 5];
                                            chunk = response_2_1.value;
                                            text = ((_c = (_b = chunk.choices[0]) === null || _b === void 0 ? void 0 : _b.delta) === null || _c === void 0 ? void 0 : _c.content) || "";
                                            controller.enqueue(encoder.encode(text));
                                            _d.label = 4;
                                        case 4: return [3 /*break*/, 2];
                                        case 5: return [3 /*break*/, 12];
                                        case 6:
                                            e_1_1 = _d.sent();
                                            e_1 = { error: e_1_1 };
                                            return [3 /*break*/, 12];
                                        case 7:
                                            _d.trys.push([7, , 10, 11]);
                                            if (!(response_2_1 && !response_2_1.done && (_a = response_2["return"]))) return [3 /*break*/, 9];
                                            return [4 /*yield*/, _a.call(response_2)];
                                        case 8:
                                            _d.sent();
                                            _d.label = 9;
                                        case 9: return [3 /*break*/, 11];
                                        case 10:
                                            if (e_1) throw e_1.error;
                                            return [7 /*endfinally*/];
                                        case 11: return [7 /*endfinally*/];
                                        case 12:
                                            controller.close();
                                            return [2 /*return*/];
                                    }
                                });
                            });
                        }
                    });
                    return [2 /*return*/, new Response(stream, {
                            headers: {
                                "Content-Type": "text/event-stream"
                            }
                        })];
                case 6:
                    error_1 = _a.sent();
                    console.error("Error in OpenAI API request:", error_1);
                    if (error_1 instanceof Error) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: error_1.message }, { status: 500 })];
                    }
                    return [2 /*return*/, server_1.NextResponse.json({ error: "Failed to process the request." }, { status: 500 })];
                case 7: return [2 /*return*/];
            }
        });
    });
}
exports.POST = POST;
