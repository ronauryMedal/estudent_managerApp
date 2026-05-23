import { Component, EnvironmentInjector, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import {
  IonIcon,
  IonLabel,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  clipboard,
  clipboardOutline,
  home,
  homeOutline,
  library,
  libraryOutline,
} from 'ionicons/icons';

type TabId = 'tab1' | 'tab2' | 'tab3';

const TAB_ORDER: TabId[] = ['tab1', 'tab2', 'tab3'];

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class TabsPage {
  public environmentInjector = inject(EnvironmentInjector);
  private readonly router = inject(Router);

  readonly activeTab = signal<TabId>('tab1');

  constructor() {
    addIcons({
      home,
      homeOutline,
      clipboard,
      clipboardOutline,
      library,
      libraryOutline,
    });

    this.syncTabFromUrl(this.router.url);
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.syncTabFromUrl(e.urlAfterRedirects));
  }

  indicatorOffset(): string {
    const index = TAB_ORDER.indexOf(this.activeTab());
    const i = index >= 0 ? index : 0;
    return `translateX(${i * 100}%)`;
  }

  isActive(tab: TabId): boolean {
    return this.activeTab() === tab;
  }

  tabIcon(tab: TabId): string {
    const icons: Record<TabId, { on: string; off: string }> = {
      tab1: { on: 'home', off: 'home-outline' },
      tab2: { on: 'clipboard', off: 'clipboard-outline' },
      tab3: { on: 'library', off: 'library-outline' },
    };
    const pair = icons[tab];
    return this.isActive(tab) ? pair.on : pair.off;
  }

  onTabChange(event: { tab: string }): void {
    const tab = event?.tab as TabId | undefined;
    if (!tab || !TAB_ORDER.includes(tab)) {
      return;
    }
    if (tab !== this.activeTab()) {
      this.activeTab.set(tab);
      void this.lightHaptic();
    }
  }

  private syncTabFromUrl(url: string): void {
    if (url.includes('/tabs/tab2')) {
      this.activeTab.set('tab2');
    } else if (url.includes('/tabs/tab3')) {
      this.activeTab.set('tab3');
    } else if (url.includes('/tabs/tab1')) {
      this.activeTab.set('tab1');
    }
  }

  private async lightHaptic(): Promise<void> {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      /* Web / sin plugin */
    }
  }
}
