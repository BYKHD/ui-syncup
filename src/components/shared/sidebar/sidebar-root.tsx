'use client';

import { RiArrowRightSLine } from '@remixicon/react';

import { RemixiconComponentType } from '@remixicon/react';
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@components/ui/collapsible';

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: RemixiconComponentType;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
      isActive?: boolean;
    }[];
  }[];
}) {
  return (
    <SidebarGroup>
      {/* <SidebarGroupLabel>Platform</SidebarGroupLabel> */}
      <SidebarMenu>
        {items.map((item) => {
          const hasSubItems = !!item.items?.length;
          const ItemIcon = item.icon;
          const defaultOpen =
            item.isActive || item.items?.some((subItem) => subItem.isActive);

          if (hasSubItems) {
            return (
              <Collapsible
                key={item.title}
                asChild
                defaultOpen={Boolean(defaultOpen)}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={item.title} isActive={item.isActive}>
                      {ItemIcon ? <ItemIcon className="size-4 shrink-0" /> : null}
                      <span>{item.title}</span>
                      <RiArrowRightSLine className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={subItem.isActive}
                          >
                            <a href={subItem.url}>
                              <span>{subItem.title}</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            );
          }

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={item.isActive}
              >
                <a href={item.url}>
                  {ItemIcon ? <ItemIcon className="size-4 shrink-0" /> : null}
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
