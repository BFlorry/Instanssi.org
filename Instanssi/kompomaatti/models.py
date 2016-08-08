# -*- coding: utf-8 -*-

import os.path

from django.db import models
from django.contrib.auth.models import User
from django.utils.translation import ugettext_lazy as _
from imagekit.models import ImageSpecField
from imagekit.processors import ResizeToFill
from datetime import datetime
from urlparse import urlparse, parse_qs
from Instanssi.kompomaatti.misc import entrysort


class Profile(models.Model):
    user = models.ForeignKey(
        User, verbose_name=_('User'))
    otherinfo = models.TextField(_(
        'Other contact information'), help_text=_('Other contact information, such as IRC nick.'))

    def __unicode__(self):
        return self.user.username

    class Meta:
        verbose_name = _('profile')
        verbose_name_plural = _('profiles')


class Event(models.Model):
    name = models.CharField(
        _('Name'), max_length=64, help_text=_('Event name'), unique=True)
    date = models.DateField(
        _('Date'), help_text=_('Event starting date'))
    archived = models.BooleanField(
        _('Archived'), help_text=_('Event is visible in archive'), default=False)
    mainurl = models.URLField(
        _('Main page url'), help_text=_('URL pointing to the event frontpage'), blank=True)

    def __unicode__(self):
        return u'[{}] {}'.format(self.pk, self.name)

    class Meta:
        verbose_name = _('event')
        verbose_name_plural = _('events')


class VoteCodeRequest(models.Model):
    event = models.ForeignKey(
        Event, verbose_name=_('Event'), help_text=_('Event to request voting rights for'), null=True)
    user = models.OneToOneField(
        User, unique=True, verbose_name=_('User'), help_text=_('User who made the request'))
    text = models.TextField(
        _('Description'), help_text=_('Short begging text for the admins'))

    def __unicode__(self):
        return self.user.username

    class Meta:
        verbose_name = _('vote code request')
        verbose_name_plural = _('vote code requests')


class TicketVoteCode(models.Model):
    event = models.ForeignKey(
        Event,
        verbose_name=_('Event'),
        help_text=_('Event with which the vote key is associated with'),
        blank=True,
        null=True)
    associated_to = models.ForeignKey(
        User,
        verbose_name=_('User'),
        help_text=_('User with whom the vote key is associated with'),
        blank=True,
        null=True)
    ticket = models.ForeignKey(
        'store.TransactionItem',  # String to avoid circular dependency
        verbose_name=_('Ticket'),
        help_text=_('Ticket key which is used as the voting key'),
        on_delete=models.SET_NULL,
        blank=True,
        null=True)
    time = models.DateTimeField(
        _('Timestamp'),
        help_text=_('When the user was associated with the key'),
        blank=True,
        null=True)

    def __unicode__(self):
        return u'{}: {}'.format(self.ticket.key, self.associated_to.username)

    class Meta:
        verbose_name = _('ticket vote code')
        verbose_name_plural = _('ticket cote codes')
        unique_together = (("event", "ticket"), ("event", "associated_to"))


class VoteCode(models.Model):
    event = models.ForeignKey(
        Event,
        verbose_name=_('Event'),
        help_text=_('Event with which the vote key is associated with'),
        blank=True,
        null=True)
    key = models.CharField(
        _('Key'),
        help_text=_('Vote key'),
        max_length=64,
        unique=True)
    associated_to = models.ForeignKey(
        User,
        verbose_name=_('User'),
        help_text=_('User with whom the vote key is associated with'),
        blank=True,
        null=True)
    time = models.DateTimeField(
        _('Timestamp'),
        help_text=_('When the user was associated with the key'),
        blank=True,
        null=True)

    def __unicode__(self):
        if self.associated_to:
            return u'{}: {}'.format(self.key, self.associated_to.username)
        else:
            return unicode(self.key)

    class Meta:
        verbose_name = _('vote code')
        verbose_name_plural = _('vote codes')
        unique_together = (("event", "key"), ("event", "associated_to"))


class Compo(models.Model):
    ENTRY_VIEW_TYPES = (
        (0, _('Nothing')),
        (1, _('Youtube first, then image')),  # Videoentryille, koodauskompoille
        (2, _('Image only')),  # Grafiikkakompoille
        (3, _('(deprecated)')),
    )
    THUMBNAIL_REQ = (
        (0, _('Require a separate thumbnail')),
        (1, _('Use the entryfile as a thumbnail (only works for jpg/png images)')),
        (2, _('Allow thumbnail (not required)')),
        (3, _('Don\'t allow thumbnail')),
    )

    event = models.ForeignKey(Event, verbose_name=_('Event'))
    name = models.CharField(_('Name'), max_length=32)
    description = models.TextField(_('Description'))
    adding_end = models.DateTimeField(
        _('Deadline for adding entries'),
        help_text=_('After this, new entries cannot be added. Modifying old entries still works.'))
    editing_end = models.DateTimeField(
        _('Deadline for editing entries'),
        help_text=_('After this, added entries can no longer be edited'))
    compo_start = models.DateTimeField(
        _('Starting time'),
        help_text=_('Compo starting time (for the event calendar)'))
    voting_start = models.DateTimeField(
        _('Voting start time'),
        help_text=_('Starting time for voting entries'))
    voting_end = models.DateTimeField(
        _('Voting end time'),
        help_text=_('Ending time for voting entries'))
    entry_sizelimit = models.IntegerField(
        _('Size limit for entries'),
        help_text=_('Size limit for entry files (in bytes)'),
        default=134217728)  # Default to 128M
    source_sizelimit = models.IntegerField(
        _('Size limit for sources'),
        help_text=_('Size limit for source files (in bytes)'),
        default=134217728)  # Default to 128M
    formats = models.CharField(
        _('Accepted entry file extensions'),
        max_length=128,
        help_text=_('Accepted file extensions for the entry file, separated by vertical bar. Eg. "png|jpg"'),
        default="zip|7z|gz|bz2")
    source_formats = models.CharField(
        _('Accepted source file extensions'),
        max_length=128,
        help_text=_('Accepted file extensions for the source file, separated by vertical bar. Eg. "png|jpg"'),
        default="zip|7z|gz|bz2")
    image_formats = models.CharField(
        _('Accepted image file extensions'),
        max_length=128,
        help_text=_('Accepted file extensions for the image file, separated by vertical bar. Eg. "png|jpg"'),
        default="png|jpg")
    active = models.BooleanField(
        _('Active'),
        help_text=_('If the compo is active, it will be visible in kompomaatti'),
        default=True)
    show_voting_results = models.BooleanField(
        _('Show results'),
        help_text=_('Show voting results for this compo'),
        default=False)
    entry_view_type = models.IntegerField(
        _('Entry preview style'),
        choices=ENTRY_VIEW_TYPES,
        default=0,
        help_text=_('What kind of entry preview is shown in entry information'))
    hide_from_archive = models.BooleanField(
        _('Hide from archive'),
        help_text=_('Hide compo voting results from the archive (This overrides event settings)'),
        default=False)
    hide_from_frontpage = models.BooleanField(
        _('Hide from event page'),
        help_text=_('Hide compo name and description from the event front page (eg. if compo is still a draft)'),
        default=False)
    is_votable = models.BooleanField(
        _('Is votable'),
        help_text=_('Entries can be voted on (disable for eg. robocode)'),
        default=True)
    thumbnail_pref = models.IntegerField(
        _('Thumbnail settings'),
        choices=THUMBNAIL_REQ,
        default=2)
    
    def __unicode__(self):
        return self.event.name + ': ' + self.name
    
    class Meta:
        verbose_name = _('compo')
        verbose_name_plural = _('compos')
            
    def is_voting_open(self):
        if not self.is_votable:
            return False
        if self.voting_start <= datetime.now() < self.voting_end:
            return True
        return False
    
    def is_adding_open(self):
        if datetime.now() < self.adding_end:
            return True
        return False

    def is_editing_open(self):
        if datetime.now() < self.editing_end:
            return True
        return False

    def has_voting_started(self):
        if not self.is_votable:
            return False
        if datetime.now() > self.voting_start:
            return True
        return False

    def readable_entry_formats(self):
        return u', '.join(self.formats.split('|'))

    def readable_source_formats(self):
        return u', '.join(self.source_formats.split('|'))

    def readable_image_formats(self):
        return ', '.join(self.image_formats.split('|'))


class Entry(models.Model):
    user = models.ForeignKey(
        User,
        verbose_name=_('User'),
        help_text=_('Owner of the entry'))
    compo = models.ForeignKey(
        Compo,
        verbose_name=_('Compo'))
    name = models.CharField(
        _('Name'),
        max_length=64,
        help_text=_('Entry name'))
    description = models.TextField(
        _('Description'),
        help_text=_('Eg. description of techniques and/or tools used.'))
    creator = models.CharField(
        _('Creator'),
        max_length=64,
        help_text=_('Name of the demogroup or individual'))
    entryfile = models.FileField(
        _('Entry file'),
        upload_to='kompomaatti/entryfiles/',
        help_text=_('Should contain everything required to run/show the entry'))
    sourcefile = models.FileField(
        _('Source file'),
        upload_to='kompomaatti/entrysources/',
        help_text=_('Optional source code package'),
        blank=True)
    imagefile_original = models.ImageField(
        _('Image'),
        upload_to='kompomaatti/entryimages/',
        help_text=_('Image of the entry (Recommended but not required)'),
        blank=True)
    imagefile_thumbnail = ImageSpecField(
        [ResizeToFill(160, 100)],
        source='imagefile_original',
        format='JPEG',
        options={'quality': 90})
    imagefile_medium = ImageSpecField(
        [ResizeToFill(640, 400)],
        source='imagefile_original',
        format='JPEG',
        options={'quality': 90})
    youtube_url = models.URLField(
        _('Youtube URL'),
        help_text=_('URL to the Youtube video of the entry'),
        blank=True)
    disqualified = models.BooleanField(
        _('Disqualified'),
        help_text=_('Entry is disqualified because of rulebreaking or technical problems'
                    '(MUST be set before voting starts!)'),
        default=False)
    disqualified_reason = models.TextField(
        _('Disqualification reason'),
        blank=True)
    archive_score = models.FloatField(
        _('Score'),
        help_text=_('Score for the archived entry. If this is not set, the score is automatically calculated from votes.'),
        null=True,
        blank=True)
    archive_rank = models.IntegerField(
        _('Rank'),
        help_text=_('Rank for the archived entry. If this is not set, the rank is automatically calculated from scores.'),
        null=True,
        blank=True)

    def __unicode__(self):
        return u'{} by {}'.format(self.name, self.creator)
    
    class Meta:
        verbose_name = _('entry')
        verbose_name_plural = _('entries')
    
    def get_format(self):
        name, ext = os.path.splitext(self.entryfile.url)
        return ext
    
    def get_score(self):
        if self.disqualified:  # If disqualified, score will be -1
            return -1.0
        elif self.archive_score:  # If entry is archived, the score will be simple to get
            return self.archive_score
        else:  # Otherwise the score has to be calculated
            score = 0.0
            votes = Vote.objects.filter(entry=self, compo=self.compo)
            for vote in votes:
                if vote.rank > 0:
                    score += (1.0 / vote.rank)
            return score

    @staticmethod
    def youtube_url_to_id(url):
        """Convert any valid YouTube URL to its video id."""
        # There's probably a regex that does this in one line...
        parsed = urlparse(url)
        querydict = parse_qs(parsed.query)
        if "v" in querydict:
            return querydict["v"][0]
        split_path = parsed.path.split("/")  # => ["", "v", "asdf"]
        if len(split_path) >= 2 and parsed.hostname == "youtu.be":
            return split_path[1]
        if len(split_path) >= 3 and split_path[1] == "v":
            return split_path[2]
        return None

    def get_youtube_embed_url(self):
        """Get embed URL for this entry's YouTube link."""
        video_id = self.youtube_url_to_id(self.youtube_url)
        return u"//www.youtube.com/embed/{}/".format(video_id)
        
    def get_rank(self):
        # If rank has been predefined, then use that
        if self.archive_rank:
            return self.archive_rank
        
        # Otherwise calculate ranks by score
        entries = entrysort.sort_by_score(Entry.objects.filter(compo=self.compo))
        n = 1
        for e in entries:
            if e.id == self.id:
                return n
            n += 1
        return n
    
    def get_show_list(self):
        show = {
            'youtube': False,
            'image': False,
            'noshow': True
        }
        
        state = self.compo.entry_view_type
        if state == 1:
            if self.youtube_url:
                show['youtube'] = True
            elif self.imagefile_original:
                show['image'] = True
        elif state == 2 or state == 3:  # 3 is deprecated
            if self.imagefile_original:
                show['image'] = True
        
        if show['image'] or show['youtube']:
            show['noshow'] = False
            
        return show
    
    def save(self, *args, **kwargs):
        try:
            this = Entry.objects.get(id=self.id)
            
            # Check entryfile
            if this.entryfile != self.entryfile:
                this.entryfile.delete(save=False)
                
            # Check sourcefile
            if this.sourcefile != self.sourcefile:
                this.sourcefile.delete(save=False)
                
            # Check imagefile_original
            if this.imagefile_original != self.imagefile_original:
                this.imagefile_original.delete(save=False)
        except:
            pass 
            
        # Continue with normal save
        super(Entry, self).save(*args, **kwargs)


class Vote(models.Model):
    user = models.ForeignKey(User, verbose_name=_('User'))
    compo = models.ForeignKey(Compo, verbose_name=_('Compo'))
    entry = models.ForeignKey(Entry, verbose_name=_('Entry'))
    rank = models.IntegerField(_('Rank'))
    
    def __unicode__(self):
        return _('{entry} by {username} as {rank}')\
            .format(entry=self.entry.name, username=self.user.username, rank=self.rank)
    
    class Meta:
        verbose_name = _('vote')
        verbose_name_plural = _('votes')


class Competition(models.Model):
    ENTRY_VIEW_TYPES = (
        (0, _('Highest result first')),
        (1, _('Lowest result first')),
    )

    event = models.ForeignKey(
        Event,
        verbose_name=_('Event'))
    name = models.CharField(
        _('Name'),
        max_length=32,
        help_text=_('Sports competition name'))
    description = models.TextField(
        _('Description'))
    participation_end = models.DateTimeField(
        _('Participation deadline time'))
    start = models.DateTimeField(
        _('Competition start time'))
    end = models.DateTimeField(
        _('Competition ending time'),
        null=True,
        blank=True)
    score_type = models.CharField(
        _('Score type'),
        max_length=8,
        help_text=_('Score type, eg. "km", "m", "sec" etc.'))
    score_sort = models.IntegerField(
        _('Score sorting'),
        choices=ENTRY_VIEW_TYPES,
        help_text=_('Whether the winner be decided by highest or the lowest score'),
        default=0)
    show_results = models.BooleanField(
        _('Show results'),
        help_text=_('Show competition results'),
        default=False)
    active = models.BooleanField(
        _('Active'),
        help_text=_('If the competition is active, it will be visible in kompomaatti'),
        default=True)
    hide_from_archive = models.BooleanField(
        _('Hide from archive'),
        help_text=_('Hide competition results from the archive (This overrides event settings)'),
        default=False)

    def __unicode__(self):
        return self.name
    
    class Meta:
        verbose_name = _('competition')
        verbose_name_plural = _('competitions')


class CompetitionParticipation(models.Model):
    competition = models.ForeignKey(
        Competition,
        verbose_name=_('Competition'))
    user = models.ForeignKey(
        User,
        verbose_name=_('User'))
    participant_name = models.CharField(
        _('Participant nickname'),
        help_text=_('Nickname with which to participate'),
        max_length=32,
        default=u'')
    score = models.FloatField(
        _('Score'),
        help_text=_('Score achieved by participant'),
        blank=True,
        default=0)
    disqualified = models.BooleanField(
        _('Disqualified'),
        help_text=_('Participant is disqualified for some reason'),
        default=False)
    disqualified_reason = models.TextField(
        _('Disqualification reason'),
        blank=True)

    def get_formatted_score(self):
        return u'{} {}'.format(self.score, self.competition.score_type)

    def get_rank(self):
        # Get results
        rankby = '-score'
        if self.competition.score_sort == 1:
            rankby = 'score'
        results = CompetitionParticipation.objects.filter(competition_id=self.competition.id).order_by(rankby)
        
        # Find self
        rank = 1
        for p in results:
            if p.id == self.id:
                return rank
            else:
                rank += 1
        return rank

    def __unicode__(self):
        return _('{competition}, {participant}: {score}').format(
            competition=self.competition.name, participant=self.participant_name, score=self.score)

    class Meta:
        verbose_name = _('participation')
        verbose_name_plural = _('participations')
