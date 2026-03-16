import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-trusted-brands',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './trusted-brands.component.html',
  styleUrl: './trusted-brands.component.scss',
})
export class TrustedBrandsComponent {
  clientLogos = [
    { name: 'Webb Fontaine', logo: 'https://webbfontaine.com/hubfs/raw_assets/public/assets/images/logo_dark.svg' },
    { name: 'Synergy', logo: 'https://www.synisys.com/wp-content/uploads/2022/06/SYNERGY-LOGO-blue.svg' },
    { name: 'Teracloud', logo: 'https://teracloud.com/images/teracloud-logo.svg' },
    { name: 'Sceon', logo: 'https://sceon.am/assets/images/sceon-logo.svg' },
    { name: 'Fifth', logo: 'https://cdn.staff.am/staff.am/upload/8/8/0/1/8801e614.png.webp' },
    { name: 'One Planet', logo: 'https://cdn.staff.am/staff.am/upload/8/e/a/6/8ea69b74.jpg.webp' },
    { name: 'Holiday Inn', logo: 'https://digital.ihg.com/is/content/ihg/hi_logo' },
    { name: 'Team Telecom', logo: 'https://www.telecomarmenia.am/img/logo.svg?v=1' },
    { name: 'UWC', logo: 'https://resources.finalsite.net/images/v1695647157/uwcdilijanorg/zgr5ydn6oqnoyghprchl/UWCD-logo.svg' },
    { name: 'UATE', logo: 'https://uate.org/wp-content/uploads/2024/05/UATE-LogoType-Main-1024x574.png' },
    { name: 'Fastshift', logo: 'https://static.ucraft.net/fs/ucraft/userFiles/fastshif/images/logo.png?v=1678703970' },
    { name: 'Valan Group', logo: 'https://www.valangroup.am/image/logo/logo.png' },
    { name: 'Drive Motors', logo: 'https://drivemotors.am/wp-content/uploads/2021/02/Drive_logo-01-e1613744824999.png' },
    { name: 'Lebanon Shawarma', logo: 'https://lebanonshawarma.am/wp-content/themes/shawarma/assets/images/lebanon_logo.svg' },
    { name: 'Courtyard By Marriott', logo: 'https://cache.marriott.com/content/dam/marriott-digital/cy/global-property-shared/en_us/logo/assets/cy_logo_L.png' },
    { name: 'Armenian Game Changers', logo: 'https://www.f6s.com/content-resource/media/1244013_large.jpeg' },
    { name: 'Ampere', logo: 'https://ampere.am/wp-content/uploads/2026/02/Frame-39-300x108-1.png' },
    { name: 'Turboline', logo: 'https://static.tildacdn.com/tild3264-6663-4239-a661-643231323933/Turboline2jpg_.png' },
    { name: 'Ceramica', logo: 'https://ceramica.fra1.digitaloceanspaces.com/2025/01/LOGONER-02-280x102.png' }
  ];
}
