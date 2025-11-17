export class AuthService {
  constructor() {
    this.project = '{{PROJECT_NAME}}';
  }

  status() {
    return `${this.project} authentication ready`;
  }
}
