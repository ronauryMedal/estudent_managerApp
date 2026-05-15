import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonFab,
  IonFabButton,
  IonFabList,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  add,
  clipboardOutline,
  libraryOutline,
  peopleOutline,
  homeOutline,
} from 'ionicons/icons';

import { ExploreContainerComponent } from '../explore-container/explore-container.component';
import { StudentMenuButtonsComponent } from '../shared/student-menu-buttons.component';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  imports: [
    StudentMenuButtonsComponent,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonIcon,
    IonFab,
    IonFabButton,
    IonFabList,
    ExploreContainerComponent,
  ],
})
export class Tab2Page {
  constructor() {
    addIcons({
      add,
      clipboardOutline,
      libraryOutline,
      peopleOutline,
      homeOutline,
    });
  }
}
