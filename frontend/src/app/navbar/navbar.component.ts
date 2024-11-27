import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  activeSection: string = 'home';

  @HostListener('window:scroll', ['$event'])
  onWindowScroll() {
    const sections = ['home', 'about', 'commitment', 'service', 'guard', 'contact', 'quote'];
    let currentSection = '';
    const scrollPosition = window.scrollY + 150;

    for (let section of sections) {
      const element = document.getElementById(section);
      if (element) {
        const offsetTop = element.offsetTop;
        const offsetBottom = offsetTop + element.offsetHeight;

        if (scrollPosition >= offsetTop && scrollPosition < offsetBottom) {
          if (currentSection !== section) {
            currentSection = section;
            break;
          }
        }
      }
    }

    if (currentSection && this.activeSection !== currentSection) {
      this.activeSection = currentSection;
    }
  }

  isActive(section: string): boolean {
    return this.activeSection === section;
  }

  scrollToSection(sectionId: string, event: Event) {
    event.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }
}
