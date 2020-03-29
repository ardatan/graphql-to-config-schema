import {
  GraphQLSchema,
  GraphQLOutputType,
  isListType,
  isNonNullType,
  isObjectType,
  isInterfaceType,
  isEnumType,
  getNamedType
} from 'graphql';

export type FileOutput = { file: string; content: string };

export function generatedMarkdown(schema: GraphQLSchema): FileOutput[] {
  const result: FileOutput[] = [];

  for (const [typeName, type] of Object.entries(schema.getTypeMap())) {
    if (
      isObjectType(type) &&
      type.astNode &&
      type.astNode.directives &&
      type.astNode.directives.find(d => d.name.value === 'md')
    ) {
      result.push({
        file: `${typeName}.generated.md`,
        content: transformTypeToMdFormat(type)
      });
    }
  }

  return result;
}

export function transformTypeToMdFormat(
  type: GraphQLOutputType,
  level = 0
): string {
  if (isListType(type)) {
    return `Array<${transformTypeToMdFormat(type.ofType, level)}>`;
  }
  if (isNonNullType(type)) {
    return transformTypeToMdFormat(type.ofType, level);
  }

  if (isObjectType(type) || isInterfaceType(type)) {
    const fields: string[] = [];

    for (const [fieldName, field] of Object.entries(type.getFields())) {
      const baseField = `${indent(level)}* \`${fieldName}\``;
      const hasChildObject = isObjectType(getNamedType(field.type));
      const isRequired =
        isNonNullType(field.type) ||
        (isListType(field.type) && isNonNullType(field.type.ofType));
      const typeToUse = transformTypeToMdFormat(field.type, level + 1);

      if (hasChildObject) {
        fields.push(
          `${baseField} (type: \`object\`${
            isRequired ? ', required' : ''
          }): ${typeToUse}`
        );
      } else {
        fields.push(
          `${baseField} (type: \`${typeToUse}\`${
            isRequired ? ', required' : ''
          })`
        );
      }
    }

    return '\n' + fields.join('\n');
  } else if (isEnumType(type)) {
    return `String (${type
      .getValues()
      .map(v => v.name)
      .join(' | ')})`;
  } else {
    return type.toString();
  }
}

function indent(num: number): string {
  return num === 0 ? '' : new Array(num * 2).fill(' ').join('');
}