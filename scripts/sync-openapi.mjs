import fs from "node:fs";
import path from "node:path";

const sourcePath = path.resolve("docs/admin/admin_swagger.json");
const targetPath = path.resolve("frontend/packages/api/openapi/admin.json");

const spec = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

let fixedPathParams = 0;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function collectPathCandidates(placeholders, parameters) {
  const nonBodyParams = parameters.filter((parameter) => parameter?.in !== "body");

  return parameters.filter((parameter) => {
    if (!parameter || typeof parameter !== "object") {
      return false;
    }

    if (parameter.in === "path" || placeholders.includes(parameter.name)) {
      return true;
    }

    if (placeholders.length === 1 && nonBodyParams.length === 1) {
      return true;
    }

    return false;
  });
}

for (const [routePath, pathItem] of Object.entries(spec.paths || {})) {
  const pathParams = [...routePath.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
  if (!pathParams.length) {
    continue;
  }

  const templateParams = pathParams.map((placeholder, index) => {
    for (const operation of Object.values(pathItem || {})) {
      if (!operation || typeof operation !== "object" || !Array.isArray(operation.parameters)) {
        continue;
      }

      const candidates = collectPathCandidates(pathParams, operation.parameters);
      const candidate = candidates[index] || candidates.find((parameter) => parameter.name === placeholder);
      if (candidate) {
        const nextParameter = clone(candidate);
        nextParameter.name = placeholder;
        nextParameter.in = "path";
        nextParameter.required = true;
        return nextParameter;
      }
    }

    return {
      type: "string",
      description: placeholder,
      name: placeholder,
      in: "path",
      required: true,
    };
  });

  for (const operation of Object.values(pathItem || {})) {
    if (!operation || typeof operation !== "object" || !Array.isArray(operation.parameters)) {
      continue;
    }

    const pathCandidates = collectPathCandidates(pathParams, operation.parameters);
    const otherParameters = operation.parameters.filter((parameter) => !pathCandidates.includes(parameter));
    const normalizedPathParameters = templateParams.map((templateParam) => clone(templateParam));

    fixedPathParams += normalizedPathParameters.reduce((count, parameter, index) => {
      const candidate = pathCandidates[index];
      if (!candidate) {
        return count + 1;
      }
      if (candidate.name !== parameter.name || candidate.in !== "path" || candidate.required !== true) {
        return count + 1;
      }
      return count;
    }, 0);

    operation.parameters = [...normalizedPathParameters, ...otherParameters];
  }
}

fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.writeFileSync(targetPath, `${JSON.stringify(spec, null, 2)}\n`);

console.log(`OpenAPI 已同步到 ${path.relative(process.cwd(), targetPath)}，修正路径参数 ${fixedPathParams} 处`);
