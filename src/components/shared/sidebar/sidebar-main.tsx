'use client';

import { usePathname } from 'next/navigation';
import { RiArrowRightSLine } from '@remixicon/react';

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { NavItem } from './type';

export function NavMain({
  items,
}: {
  items: NavItem[];
}) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      {/* <SidebarGroupLabel>Platform</SidebarGroupLabel> */}
      <SidebarMenu>
        {items.map((item) => {
          const hasSubItems = !!item.items?.length;
          const ItemIcon = item.icon;

          if (hasSubItems) {
            const isGroupActive = item.items?.some((subItem) => pathname === subItem.url || pathname.startsWith(`${subItem.url}/`));

            return (
              <Collapsible
                key={item.title}
                asChild
                defaultOpen={isGroupActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={item.title} isActive={isGroupActive}>
                      {ItemIcon ? <ItemIcon className="size-4 shrink-0" /> : null}
                      <span>{item.title}</span>
                      <RiArrowRightSLine className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => {
                        const isSubItemActive = pathname === subItem.url || (
                          pathname.startsWith(`${subItem.url}/`) &&
                          !item.items?.some(
                            (other) => other.url !== subItem.url &&
                              other.url.length > subItem.url.length &&
                              (pathname === other.url || pathname.startsWith(`${other.url}/`))
                          )
                        );
                        return (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton asChild isActive={isSubItemActive}>
                              <a href={subItem.url}>
                                <span>{subItem.title}</span>
                              </a>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            );
          }

          const isItemActive = pathname === item.url || (item.url !== '/' && pathname.startsWith(`${item.url}/`));

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={isItemActive}
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
