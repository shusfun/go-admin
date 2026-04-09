import { AdminPageStack, Button, PageHeader, ReadonlyCodeBlock, SectionCard } from "@suiyuan/ui-admin";

type ToolLinkPageProps = {
  title: string;
  description: string;
  kicker?: string;
  links: Array<{
    label: string;
    href: string;
    note: string;
  }>;
  notes: string[];
};

export function ToolLinkPage({
  title,
  description,
  kicker = "Dev Tool",
  links,
  notes,
}: ToolLinkPageProps) {
  return (
    <AdminPageStack>
      <PageHeader description={description} kicker={kicker} title={title} />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {links.map((link) => (
          <SectionCard key={link.href} title={link.label} description={link.note}>
            <div className="grid gap-4">
              <div>
                <Button asChild type="button">
                  <a href={link.href} rel="noreferrer" target="_blank">
                    打开页面
                  </a>
                </Button>
              </div>
              <ReadonlyCodeBlock title="目标地址">{link.href}</ReadonlyCodeBlock>
            </div>
          </SectionCard>
        ))}
      </div>

      <SectionCard title="当前阶段说明" description="这些工具页先作为可达入口保留，后续再决定是否完全 React 化。">
        <div className="space-y-2 text-sm leading-7 text-muted-foreground">
          {notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      </SectionCard>
    </AdminPageStack>
  );
}
