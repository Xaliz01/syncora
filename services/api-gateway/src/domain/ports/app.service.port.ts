export abstract class AbstractAppService {
  abstract getHealth(): { status: string; service: string };
}
