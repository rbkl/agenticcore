import { Controller, Get, Post, Put, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PolicyService } from './policy.service';
import { CreateSubmissionDto, AddRiskDto, SelectCoverageDto } from './dto/create-submission.dto';

@ApiTags('policies')
@Controller('policies')
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  @Post('submissions')
  @ApiOperation({ summary: 'Create a new submission' })
  @ApiResponse({ status: 201, description: 'Submission created' })
  async createSubmission(@Body() dto: CreateSubmissionDto) {
    return this.policyService.createSubmission(dto);
  }

  @Get('submissions/:id')
  @ApiOperation({ summary: 'Get submission details' })
  async getSubmission(@Param('id') id: string) {
    return this.policyService.getSubmission(id);
  }

  @Post('submissions/:id/risks')
  @ApiOperation({ summary: 'Add a risk to the submission' })
  async addRisk(@Param('id') id: string, @Body() dto: AddRiskDto) {
    return this.policyService.addRisk(id, dto);
  }

  @Post('submissions/:id/coverages')
  @ApiOperation({ summary: 'Select coverage for the submission' })
  async selectCoverage(@Param('id') id: string, @Body() dto: SelectCoverageDto) {
    return this.policyService.selectCoverage(id, dto);
  }

  @Post('submissions/:id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit for underwriting review' })
  async submit(@Param('id') id: string) {
    return this.policyService.submitForReview(id);
  }

  @Post('submissions/:id/underwrite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start underwriting review' })
  async startUnderwriting(
    @Param('id') id: string,
    @Body() body: { assignedTo: string; riskScore: number },
  ) {
    return this.policyService.startUnderwriting(id, body.assignedTo, body.riskScore);
  }

  @Post('submissions/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve underwriting' })
  async approveUnderwriting(
    @Param('id') id: string,
    @Body() body: { approvedBy: string; conditions?: string[] },
  ) {
    return this.policyService.approveUnderwriting(id, body.approvedBy, body.conditions);
  }

  @Post('submissions/:id/decline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Decline underwriting' })
  async declineUnderwriting(
    @Param('id') id: string,
    @Body() body: { declinedBy: string; reasons: string[] },
  ) {
    return this.policyService.declineUnderwriting(id, body.declinedBy, body.reasons);
  }

  @Post('submissions/:id/quote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a quote (triggers rating)' })
  async requestQuote(@Param('id') id: string) {
    // Rating integration will be added in Phase 3
    return { message: 'Quote requested', submissionId: id };
  }

  @Post('submissions/:id/bind')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bind the policy' })
  async bindPolicy(@Param('id') id: string) {
    return this.policyService.bindPolicy(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get policy details' })
  async getPolicy(@Param('id') id: string) {
    return this.policyService.getSubmission(id);
  }

  @Post(':id/issue')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Issue the policy' })
  async issuePolicy(@Param('id') id: string) {
    return this.policyService.issuePolicy(id);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate policy (mark as in-force)' })
  async activatePolicy(@Param('id') id: string) {
    return this.policyService.activatePolicy(id);
  }

  @Post(':id/endorse')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request an endorsement' })
  async requestEndorsement(
    @Param('id') id: string,
    @Body() body: { changes: Array<{ field: string; oldValue: unknown; newValue: unknown }>; effectiveDate: string },
  ) {
    return this.policyService.requestEndorsement(id, body.changes, body.effectiveDate);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request cancellation' })
  async requestCancellation(
    @Param('id') id: string,
    @Body() body: { reason: string; effectiveDate: string; requestedBy: string },
  ) {
    return this.policyService.requestCancellation(id, body.reason, body.effectiveDate, body.requestedBy);
  }

  @Get(':id/events')
  @ApiOperation({ summary: 'Get policy event history' })
  async getEvents(@Param('id') id: string) {
    return this.policyService.getEvents(id);
  }
}
