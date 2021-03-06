'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _typeof(obj) {
  "@babel/helpers - typeof";

  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
    _typeof = function (obj) {
      return typeof obj;
    };
  } else {
    _typeof = function (obj) {
      return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    };
  }

  return _typeof(obj);
}

function safeToString(value) {
  return _typeof(value) === 'object' ? JSON.stringify(value) : '' + value;
}
function isNonEmpty(value) {
  return typeof value !== 'undefined' && value !== null && trim(value).length > 0;
}
function isArray(arr) {
  return Object.prototype.toString.call(arr) === '[object Array]';
}
var hasTrim = !!String.prototype.trim;
function trim(value) {
  return hasTrim ? ('' + value).trim() : ('' + value).replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
}
function isString(str) {
  return typeof str === 'string';
}
function strEqualsIgnoreCase(fistStr, secondStr) {
  return isString(fistStr) && isString(secondStr) && trim(fistStr.toLowerCase()) === trim(secondStr.toLowerCase());
}
function isObject(obj) {
  return !!obj && _typeof(obj) === 'object' && !isArray(obj);
}
function isFunction(fun) {
  return fun && typeof fun === 'function';
}
function asParamOrEmpty(param, value, transform) {
  return isNonEmpty(value) ? [param, isFunction(transform) ? transform(value) : value] : [];
}
function asStringParam(param, value) {
  return asParamOrEmpty(param, value, function (s) {
    return encodeURIComponent(s);
  });
}
function mapAsParams(paramsMap) {
  if (paramsMap && isObject(paramsMap)) {
    var array = [];
    Object.keys(paramsMap).forEach(function (key) {
      var value = paramsMap[key];
      value && !isObject(value) && value.length && array.push([encodeURIComponent(key), encodeURIComponent(value)]);
    });
    return array;
  } else {
    return [];
  }
}
function merge(obj1, obj2) {
  var res = {};
  var clean = function clean(obj) {
    return isObject(obj) ? obj : {};
  };
  var first = clean(obj1);
  var second = clean(obj2);
  Object.keys(first).forEach(function (key) {
    res[key] = first[key];
  });
  Object.keys(second).forEach(function (key) {
    res[key] = second[key];
  });
  return res;
}

var toParams = function toParams(tuples) {
  var acc = '';
  tuples.forEach(function (tuple) {
    var operator = acc.length === 0 ? '?' : '&';
    if (tuple && tuple.length && tuple.length === 2 && tuple[0] && tuple[1]) {
      acc = "".concat(acc).concat(operator).concat(tuple[0], "=").concat(tuple[1]);
    }
  });
  return acc;
};

var EVENT_BUS_NAMESPACE = '__li__evt_bus';
var ERRORS_PREFIX = 'li_errors';
var PEOPLE_VERIFIED_LS_ENTRY = '_li_duid';
var DEFAULT_IDEX_AJAX_TIMEOUT = 5000;
var DEFAULT_IDEX_URL = 'https://idx.liadm.com/idex';

function _emit(prefix, message) {
  window && window[EVENT_BUS_NAMESPACE] && window[EVENT_BUS_NAMESPACE].emit(prefix, message);
}
function fromError(name, exception) {
  error(name, exception.message, exception);
}
function error(name, message) {
  var e = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var wrapped = new Error(message || e.message);
  wrapped.stack = e.stack;
  wrapped.name = name || 'unknown error';
  wrapped.lineNumber = e.lineNumber;
  wrapped.columnNumber = e.columnNumber;
  _emit(ERRORS_PREFIX, wrapped);
}

function _responseReceived(storageHandler, successCallback) {
  return function (response) {
    var responseObj = {};
    if (response) {
      try {
        responseObj = JSON.parse(response);
      } catch (ex) {
        fromError('IdentityResolverParser', ex);
      }
    }
    successCallback(responseObj);
  };
}
function IdentityResolver(config, storageHandler, calls) {
  try {
    var nonNullConfig = config || {};
    var idexConfig = nonNullConfig.identityResolutionConfig || {};
    var externalIds = nonNullConfig.retrievedIdentifiers || [];
    var source = idexConfig.source || 'unknown';
    var publisherId = idexConfig.publisherId || 'any';
    var url = idexConfig.url || DEFAULT_IDEX_URL;
    var timeout = idexConfig.ajaxTimeout || DEFAULT_IDEX_AJAX_TIMEOUT;
    var tuples = [];
    tuples.push(asStringParam('duid', nonNullConfig.peopleVerifiedId));
    tuples.push(asStringParam('us_privacy', nonNullConfig.usPrivacyString));
    tuples.push(asParamOrEmpty('gdpr', nonNullConfig.gdprApplies, function (v) {
      return encodeURIComponent(v ? 1 : 0);
    }));
    tuples.push(asStringParam('gdpr_consent', nonNullConfig.gdprConsent));
    externalIds.forEach(function (retrievedIdentifier) {
      tuples.push(asStringParam(retrievedIdentifier.name, retrievedIdentifier.value));
    });
    var composeUrl = function composeUrl(additionalParams) {
      var originalParams = tuples.slice().concat(mapAsParams(additionalParams));
      var params = toParams(originalParams);
      return "".concat(url, "/").concat(source, "/").concat(publisherId).concat(params);
    };
    var unsafeResolve = function unsafeResolve(successCallback, errorCallback, additionalParams) {
      calls.ajaxGet(composeUrl(additionalParams), _responseReceived(storageHandler, successCallback), errorCallback, timeout);
    };
    return {
      resolve: function resolve(successCallback, errorCallback, additionalParams) {
        try {
          unsafeResolve(successCallback, errorCallback, additionalParams);
        } catch (e) {
          errorCallback();
          fromError('IdentityResolve', e);
        }
      },
      getUrl: function getUrl(additionalParams) {
        return composeUrl(additionalParams);
      }
    };
  } catch (e) {
    fromError('IdentityResolver', e);
    return {
      resolve: function resolve(successCallback, errorCallback) {
        errorCallback();
        fromError('IdentityResolver.resolve', e);
      },
      getUrl: function getUrl() {
        fromError('IdentityResolver.getUrl', e);
      }
    };
  }
}

function enrich(state, storageHandler) {
  try {
    return {
      peopleVerifiedId: state.peopleVerifiedId || storageHandler.getDataFromLocalStorage(PEOPLE_VERIFIED_LS_ENTRY)
    };
  } catch (e) {
    error('PeopleVerifiedEnrich', e.message, e);
    return {};
  }
}

var emailRegex = function emailRegex() {
  return /\S+(@|%40)\S+\.\S+/;
};
function isEmail(s) {
  return emailRegex().test(s);
}
var emailLikeRegex = /"([^"]+(@|%40)[^"]+[.][a-z]*(\s+)?)(\\"|")/;
function containsEmailField(s) {
  return emailLikeRegex.test(s);
}

function enrich$1(state, storageHandler) {
  try {
    return _parseIdentifiersToResolve(state, storageHandler);
  } catch (e) {
    fromError('IdentifiersEnrich', e);
    return {};
  }
}
function _parseIdentifiersToResolve(state, storageHandler) {
  state.identifiersToResolve = state.identifiersToResolve || [];
  var cookieNames = isArray(state.identifiersToResolve) ? state.identifiersToResolve : safeToString(state.identifiersToResolve).split(',');
  var identifiers = [];
  for (var i = 0; i < cookieNames.length; i++) {
    var identifierName = trim(cookieNames[i]);
    var identifierValue = storageHandler.getCookie(identifierName) || storageHandler.getDataFromLocalStorage(identifierName);
    if (identifierValue && !containsEmailField(safeToString(identifierValue)) && !isEmail(safeToString(identifierValue))) {
      identifiers.push({
        name: identifierName,
        value: safeToString(identifierValue)
      });
    }
  }
  return {
    retrievedIdentifiers: identifiers
  };
}

var StorageStrategy = {
  cookie: 'cookie',
  localStorage: 'ls',
  none: 'none'
};

var _noOp = function _noOp() {
  return undefined;
};
function StorageHandler(storageStrategy, externalStorageHandler) {
  var errors = [];
  function _externalOrError(functionName) {
    var hasExternal = externalStorageHandler && externalStorageHandler[functionName] && isFunction(externalStorageHandler[functionName]);
    if (hasExternal) {
      return externalStorageHandler[functionName];
    } else {
      errors.push(functionName);
      return _noOp;
    }
  }
  var _orElseNoOp = function _orElseNoOp(fName) {
    return strEqualsIgnoreCase(storageStrategy, StorageStrategy.none) ? _noOp : _externalOrError(fName);
  };
  var handler = {
    localStorageIsEnabled: _orElseNoOp('localStorageIsEnabled'),
    getCookie: _externalOrError('getCookie'),
    getDataFromLocalStorage: _externalOrError('getDataFromLocalStorage')
  };
  if (errors.length > 0) {
    error('StorageHandler', "The storage functions '".concat(JSON.stringify(errors), "' are not provided"));
  }
  return handler;
}

var _noOp$1 = function _noOp() {
  return undefined;
};
function CallHandler(externalCallHandler) {
  var errors = [];
  function _externalOrError(functionName) {
    var hasExternal = externalCallHandler && externalCallHandler[functionName] && isFunction(externalCallHandler[functionName]);
    if (hasExternal) {
      return externalCallHandler[functionName];
    } else {
      errors.push(functionName);
      return _noOp$1;
    }
  }
  var handler = {
    ajaxGet: _externalOrError('ajaxGet'),
    pixelGet: _externalOrError('pixelGet')
  };
  if (errors.length > 0) {
    error('CallHandler', "The call functions '".concat(JSON.stringify(errors), "' are not provided"));
  }
  return handler;
}

function _minimalInitialization(liveConnectConfig, externalStorageHandler, externalCallHandler) {
  try {
    var callHandler = CallHandler(externalCallHandler);
    var storageHandler = StorageHandler(liveConnectConfig.storageStrategy, externalStorageHandler);
    var peopleVerifiedData = merge(liveConnectConfig, enrich(liveConnectConfig, storageHandler));
    var finalData = merge(peopleVerifiedData, enrich$1(peopleVerifiedData, storageHandler));
    var resolver = IdentityResolver(finalData, storageHandler, callHandler);
    return {
      push: function push(arg) {
        return window.liQ.push(arg);
      },
      fire: function fire() {
        return window.liQ.push({});
      },
      peopleVerifiedId: peopleVerifiedData.peopleVerifiedId,
      ready: true,
      resolve: resolver.resolve,
      resolutionCallUrl: resolver.getUrl,
      config: liveConnectConfig
    };
  } catch (x) {
  }
}
function MinimalLiveConnect(liveConnectConfig, externalStorageHandler, externalCallHandler) {
  try {
    window && (window.liQ = window.liQ || []);
    var configuration = isObject(liveConnectConfig) && liveConnectConfig || {};
    return _minimalInitialization(configuration, externalStorageHandler, externalCallHandler);
  } catch (x) {
  }
  return {};
}

exports.MinimalLiveConnect = MinimalLiveConnect;
