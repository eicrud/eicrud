import { UserProfile } from '../userprofile/userprofile.entity';

export class Picture implements CrudEntity {
  id: string;

  @ManyToOne(() => UserProfile)
  profile: UserProfile | string;

  width: number;

  height: number;

  alt: string;

  src: string;

  createdAt: Date;

  updatedAt: Date;
}
