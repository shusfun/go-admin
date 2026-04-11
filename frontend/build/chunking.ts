type SourceChunkGroup = {
  chunkName: string;
  matchers: string[];
};

type ManualChunkOptions = {
  sourceGroups?: SourceChunkGroup[];
};

function normalizeId(id: string) {
  return id.replace(/\\/g, "/");
}

const packageChunkGroups: SourceChunkGroup[] = [
  {
    chunkName: "react-core",
    matchers: ["/node_modules/react/", "/node_modules/react-dom/", "/node_modules/scheduler/"],
  },
  {
    chunkName: "app-framework",
    matchers: ["/node_modules/react-router/", "/node_modules/react-router-dom/", "/node_modules/@tanstack/react-query/"],
  },
  {
    chunkName: "form-stack",
    matchers: ["/node_modules/react-hook-form/", "/node_modules/@hookform/resolvers/", "/node_modules/zod/"],
  },
  {
    chunkName: "radix-ui",
    matchers: ["/node_modules/@radix-ui/"],
  },
  {
    chunkName: "react-day-picker",
    matchers: ["/node_modules/react-day-picker/"],
  },
  {
    chunkName: "icons",
    matchers: ["/node_modules/lucide-react/"],
  },
  {
    chunkName: "toast",
    matchers: ["/node_modules/sonner/"],
  },
  {
    chunkName: "go-admin-data",
    matchers: [
      "/frontend/packages/api/",
      "/frontend/packages/auth/",
      "/frontend/packages/core/",
      "/frontend/packages/types/",
    ],
  },
  {
    chunkName: "go-admin-foundation",
    matchers: ["/frontend/packages/design-tokens/", "/frontend/packages/i18n/"],
  },
  {
    chunkName: "go-admin-ui-admin",
    matchers: ["/frontend/packages/ui-admin/"],
  },
  {
    chunkName: "go-admin-ui-mobile",
    matchers: ["/frontend/packages/ui-mobile/"],
  },
];

function matchChunk(id: string, groups: SourceChunkGroup[]) {
  return groups.find((group) => group.matchers.some((matcher) => id.includes(matcher)))?.chunkName;
}

export function createManualChunkResolver(options: ManualChunkOptions = {}) {
  return function manualChunks(rawId: string) {
    const id = normalizeId(rawId);
    const sourceChunk = matchChunk(id, options.sourceGroups ?? []);
    if (sourceChunk) {
      return sourceChunk;
    }

    return matchChunk(id, packageChunkGroups);
  };
}
