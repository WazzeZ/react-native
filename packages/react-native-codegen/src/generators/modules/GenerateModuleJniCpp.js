/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 * @format
 */

'use strict';

import type {
  FunctionTypeAnnotationParam,
  FunctionTypeAnnotationReturn,
  NativeModuleShape,
  ObjectTypeAliasTypeShape,
  SchemaType,
} from '../../CodegenSchema';

const {getTypeAliasTypeAnnotation} = require('./Utils');

type FilesOutput = Map<string, string>;

const propertyHeaderTemplate =
  'static facebook::jsi::Value __hostFunction_Native::_MODULE_NAME_::SpecJSI_::_PROPERTY_NAME_::(facebook::jsi::Runtime& rt, TurboModule &turboModule, const facebook::jsi::Value* args, size_t count) {';

const propertyCastTemplate =
  'static_cast<JavaTurboModule &>(turboModule).invokeJavaMethod(rt, ::_KIND_::, "::_PROPERTY_NAME_::", "::_SIGNATURE_::", args, count);';

const propertyTemplate = `
${propertyHeaderTemplate}
  return ${propertyCastTemplate}
}`;

const propertyDefTemplate =
  '  methodMap_["::_PROPERTY_NAME_::"] = MethodMetadata {::_ARGS_COUNT_::, __hostFunction_Native::_MODULE_NAME_::SpecJSI_::_PROPERTY_NAME_::};';

const moduleTemplate = `
::_TURBOMODULE_METHOD_INVOKERS_::

Native::_MODULE_NAME_::SpecJSI::Native::_MODULE_NAME_::SpecJSI(const JavaTurboModule::InitParams &params)
  : JavaTurboModule(params) {
::_PROPERTIES_MAP_::
}`.trim();

const oneModuleLookupTemplate = `  if (moduleName == "::_MODULE_NAME_::") {
    return std::make_shared<Native::_MODULE_NAME_::SpecJSI>(params);
  }`;

const template = `
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * ${'@'}generated by codegen project: GenerateModuleJniCpp.js
 */

#include ::_INCLUDE_::

namespace facebook {
namespace react {

::_MODULES_::

std::shared_ptr<TurboModule> ::_LIBRARY_NAME_::_ModuleProvider(const std::string moduleName, const JavaTurboModule::InitParams &params) {
::_MODULE_LOOKUP_::
}

} // namespace react
} // namespace facebook
`;

function translateReturnTypeToKind(
  typeAnnotation: FunctionTypeAnnotationReturn,
): string {
  switch (typeAnnotation.type) {
    case 'ReservedFunctionValueTypeAnnotation':
      switch (typeAnnotation.name) {
        case 'RootTag':
          return 'NumberKind';
        default:
          (typeAnnotation.name: empty);
          throw new Error(
            `Invalid ReservedFunctionValueTypeName name, got ${typeAnnotation.name}`,
          );
      }
    case 'VoidTypeAnnotation':
      return 'VoidKind';
    case 'StringTypeAnnotation':
      return 'StringKind';
    case 'BooleanTypeAnnotation':
      return 'BooleanKind';
    case 'NumberTypeAnnotation':
    case 'DoubleTypeAnnotation':
    case 'FloatTypeAnnotation':
    case 'Int32TypeAnnotation':
      return 'NumberKind';
    case 'GenericPromiseTypeAnnotation':
      return 'PromiseKind';
    case 'GenericObjectTypeAnnotation':
    case 'ObjectTypeAnnotation':
      return 'ObjectKind';
    case 'ArrayTypeAnnotation':
      return 'ArrayKind';
    default:
      // TODO (T65847278): Figure out why this does not work.
      // (typeAnnotation.type: empty);
      throw new Error(
        `Unknown prop type for returning value, found: ${typeAnnotation.type}"`,
      );
  }
}

function translateParamTypeToJniType(
  param: FunctionTypeAnnotationParam,
  aliases: $ReadOnly<{[aliasName: string]: ObjectTypeAliasTypeShape, ...}>,
): string {
  const {nullable, typeAnnotation} = param;

  const realTypeAnnotation =
    typeAnnotation.type === 'TypeAliasTypeAnnotation'
      ? getTypeAliasTypeAnnotation(typeAnnotation.name, aliases)
      : typeAnnotation;

  switch (realTypeAnnotation.type) {
    case 'ReservedFunctionValueTypeAnnotation':
      switch (realTypeAnnotation.name) {
        case 'RootTag':
          return 'D';
        default:
          (realTypeAnnotation.name: empty);
          throw new Error(
            `Invalid ReservedFunctionValueTypeName name, got ${realTypeAnnotation.name}`,
          );
      }
    case 'VoidTypeAnnotation':
      return 'V';
    case 'StringTypeAnnotation':
      return 'Ljava/lang/String;';
    case 'BooleanTypeAnnotation':
      return nullable ? 'Ljava/lang/Boolean' : 'Z';
    case 'NumberTypeAnnotation':
    case 'DoubleTypeAnnotation':
    case 'FloatTypeAnnotation':
    case 'Int32TypeAnnotation':
      return nullable ? 'Ljava/lang/Double;' : 'D';
    case 'GenericPromiseTypeAnnotation':
      return 'Lcom/facebook/react/bridge/Promise;';
    case 'GenericObjectTypeAnnotation':
    case 'ObjectTypeAnnotation':
      return 'Lcom/facebook/react/bridge/ReadableMap;';
    case 'ArrayTypeAnnotation':
      return 'Lcom/facebook/react/bridge/ReadableArray;';
    case 'FunctionTypeAnnotation':
      return 'Lcom/facebook/react/bridge/Callback;';
    default:
      throw new Error(
        `Unknown prop type for method arg, found: ${realTypeAnnotation.type}"`,
      );
  }
}

function translateReturnTypeToJniType(
  typeAnnotation: FunctionTypeAnnotationReturn,
): string {
  const {nullable} = typeAnnotation;

  switch (typeAnnotation.type) {
    case 'ReservedFunctionValueTypeAnnotation':
      switch (typeAnnotation.name) {
        case 'RootTag':
          return 'D';
        default:
          (typeAnnotation.name: empty);
          throw new Error(
            `Invalid ReservedFunctionValueTypeName name, got ${typeAnnotation.name}`,
          );
      }
    case 'VoidTypeAnnotation':
      return 'V';
    case 'StringTypeAnnotation':
      return 'Ljava/lang/String;';
    case 'BooleanTypeAnnotation':
      return nullable ? 'Ljava/lang/Boolean' : 'Z';
    case 'NumberTypeAnnotation':
    case 'DoubleTypeAnnotation':
    case 'FloatTypeAnnotation':
    case 'Int32TypeAnnotation':
      return nullable ? 'Ljava/lang/Double;' : 'D';
    case 'GenericPromiseTypeAnnotation':
      return 'Lcom/facebook/react/bridge/Promise;';
    case 'GenericObjectTypeAnnotation':
    case 'ObjectTypeAnnotation':
      return 'Lcom/facebook/react/bridge/WritableMap;';
    case 'ArrayTypeAnnotation':
      return 'Lcom/facebook/react/bridge/WritableArray;';
    default:
      throw new Error(
        `Unknown prop type for method return type, found: ${typeAnnotation.type}"`,
      );
  }
}

function translateMethodTypeToJniSignature(
  property,
  aliases: $ReadOnly<{[aliasName: string]: ObjectTypeAliasTypeShape, ...}>,
): string {
  const {name, typeAnnotation} = property;
  const {returnTypeAnnotation} = typeAnnotation;

  const params = [...typeAnnotation.params];
  let processedReturnTypeAnnotation = returnTypeAnnotation;
  const isPromiseReturn =
    returnTypeAnnotation.type === 'GenericPromiseTypeAnnotation';
  if (isPromiseReturn) {
    processedReturnTypeAnnotation = {
      nullable: false,
      type: 'VoidTypeAnnotation',
    };
  }

  const argsSignatureParts = params.map(t => {
    return translateParamTypeToJniType(t, aliases);
  });
  if (isPromiseReturn) {
    // Additional promise arg for this case.
    argsSignatureParts.push(translateReturnTypeToJniType(returnTypeAnnotation));
  }
  const argsSignature = argsSignatureParts.join('');
  const returnSignature =
    name === 'getConstants'
      ? 'Ljava/util/Map;'
      : translateReturnTypeToJniType(processedReturnTypeAnnotation);

  return `(${argsSignature})${returnSignature}`;
}

function translateMethodForImplementation(
  property,
  aliases: $ReadOnly<{[aliasName: string]: ObjectTypeAliasTypeShape, ...}>,
): string {
  const {returnTypeAnnotation} = property.typeAnnotation;

  const numberOfParams =
    property.typeAnnotation.params.length +
    (returnTypeAnnotation.type === 'GenericPromiseTypeAnnotation' ? 1 : 0);
  const translatedArguments = property.typeAnnotation.params
    .map(param => param.name)
    .concat(
      returnTypeAnnotation.type === 'GenericPromiseTypeAnnotation'
        ? ['promise']
        : [],
    )
    .slice(1)
    .join(':')
    .concat(':');
  if (
    property.name === 'getConstants' &&
    returnTypeAnnotation.type === 'ObjectTypeAnnotation' &&
    returnTypeAnnotation.properties &&
    returnTypeAnnotation.properties.length === 0
  ) {
    return '';
  }
  return propertyTemplate
    .replace(/::_KIND_::/g, translateReturnTypeToKind(returnTypeAnnotation))
    .replace(/::_PROPERTY_NAME_::/g, property.name)
    .replace(
      /::_ARGS_::/g,
      numberOfParams === 0
        ? ''
        : (numberOfParams === 1 ? '' : ':') + translatedArguments,
    )
    .replace(
      /::_SIGNATURE_::/g,
      translateMethodTypeToJniSignature(property, aliases),
    );
}

module.exports = {
  generate(
    libraryName: string,
    schema: SchemaType,
    moduleSpecName: string,
  ): FilesOutput {
    const nativeModules: {[name: string]: NativeModuleShape, ...} = Object.keys(
      schema.modules,
    )
      .map(moduleName => {
        const modules = schema.modules[moduleName].nativeModules;
        if (modules == null) {
          return null;
        }

        return modules;
      })
      .filter(Boolean)
      .reduce((acc, modules) => Object.assign(acc, modules), {});

    const modules = Object.keys(nativeModules)
      .map(name => {
        const {aliases, properties} = nativeModules[name];
        const translatedMethods = properties
          .map(property => translateMethodForImplementation(property, aliases))
          .join('\n');
        return moduleTemplate
          .replace(/::_TURBOMODULE_METHOD_INVOKERS_::/g, translatedMethods)
          .replace(
            '::_PROPERTIES_MAP_::',
            properties
              .map(
                ({
                  name: propertyName,
                  typeAnnotation: {params, returnTypeAnnotation},
                }) =>
                  propertyName === 'getConstants' &&
                  returnTypeAnnotation.type === 'ObjectTypeAnnotation' &&
                  returnTypeAnnotation.properties &&
                  returnTypeAnnotation.properties.length === 0
                    ? ''
                    : propertyDefTemplate
                        .replace(/::_PROPERTY_NAME_::/g, propertyName)
                        .replace(/::_ARGS_COUNT_::/g, params.length.toString()),
              )
              .join('\n'),
          )
          .replace(/::_MODULE_NAME_::/g, name);
      })
      .join('\n');

    const moduleLookup = Object.keys(nativeModules)
      .map(name => {
        return oneModuleLookupTemplate.replace(/::_MODULE_NAME_::/g, name);
      })
      .join('\n');

    const fileName = `${moduleSpecName}-generated.cpp`;
    const replacedTemplate = template
      .replace(/::_MODULES_::/g, modules)
      .replace(/::_LIBRARY_NAME_::/g, libraryName)
      .replace(/::_MODULE_LOOKUP_::/g, moduleLookup)
      .replace(/::_INCLUDE_::/g, `"${moduleSpecName}.h"`);
    return new Map([[fileName, replacedTemplate]]);
  },
};
