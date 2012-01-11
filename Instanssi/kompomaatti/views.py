# -*- coding: utf-8 -*-

from django.shortcuts import render_to_response
from models import Compo, Entry
from django.core.exceptions import ObjectDoesNotExist
from django.http import Http404, HttpResponseRedirect
from forms import AddEntryForm
from django.template import RequestContext
from django.contrib.auth.decorators import login_required
from django.contrib.auth import logout

def custom_render(request, tpl, context={}):
    compos = Compo.objects.all()
    context['compos'] = compos
    context['logged'] = request.user.is_authenticated()
    return render_to_response(tpl, context, context_instance=RequestContext(request))


def index(request):
    return custom_render(request, 'kompomaatti/index.html')


def help(request):
    return custom_render(request, 'kompomaatti/help.html')

@login_required
def myprods(request): 
    if request.method == 'POST':
        addform = AddEntryForm(request.POST, request.FILES) 
        if addform.is_valid(): 
            nentry = addform.save(commit=False)
            nentry.user = request.user
            nentry.save()
            return HttpResponseRedirect('/kompomaatti/myprods/') 
    else:
        addform = AddEntryForm() 

    my_entries = Entry.objects.filter(user=request.user)

    return custom_render(request, 'kompomaatti/myprods.html', {
        'addform': addform,
        'myentries': my_entries
    })


def compo(request, compo_id):
    try:
        c = Compo.objects.get(id=compo_id)
    except ObjectDoesNotExist:
        raise Http404
    
    e = Entry.objects.filter(compo=c)
    return custom_render(request, 'kompomaatti/compo.html', {
        'compo': c,
        'entries': e
    })


def compolist(request):
    compos = Compo.objects.filter(active=True).order_by('compo_start')
    entries = {}
    for compo in compos:
        entries[compo.id] = Entry.objects.filter(compo=compo)
    return custom_render(request, 'kompomaatti/compolist.html', {
        'compolist': compos,
        'entries': entries,
    })


def entry(request, entry_id):
    try:
        entry = Entry.objects.get(id=entry_id)
    except ObjectDoesNotExist:
        raise Http404
    return custom_render(request, 'kompomaatti/entry.html', {
        'entry': entry
    })

def dologout(request):
    logout(request)
    return HttpResponseRedirect('/kompomaatti/') 
